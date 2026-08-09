const mockStripe={
  customers:{list:jest.fn(),create:jest.fn(),update:jest.fn()},
  subscriptions:{list:jest.fn(),retrieve:jest.fn(),update:jest.fn(),create:jest.fn()},
  subscriptionSchedules:{retrieve:jest.fn(),release:jest.fn(),create:jest.fn()},
  paymentMethods:{attach:jest.fn()},
};

jest.mock("stripe",()=>jest.fn(()=>mockStripe));

const Stripe=require("stripe");
const handler=require("../api/create-subscription");

function mockResponse(){
  const res={statusCode:200,body:null};
  res.status=jest.fn(code=>{res.statusCode=code;return res;});
  res.json=jest.fn(body=>{res.body=body;return res;});
  return res;
}

describe("subscription plan changes",()=>{
  beforeEach(()=>{
    jest.clearAllMocks();
    Stripe.mockImplementation(()=>mockStripe);
    process.env.STRIPE_SECRET_KEY="sk_test_placeholder";
    process.env.STRIPE_PRICE_PRO_MONTHLY="price_pro_intro";
    process.env.STRIPE_PRICE_PRO_REGULAR="price_pro_regular";
    process.env.STRIPE_PRICE_PRO_YEARLY="price_pro_yearly";
    process.env.STRIPE_PRICE_MASTER_MONTHLY="price_master_intro";
    process.env.STRIPE_PRICE_MASTER_REGULAR="price_master_regular";
    process.env.STRIPE_PRICE_MASTER_YEARLY="price_master_yearly";
    mockStripe.customers.list.mockResolvedValue({data:[{id:"cus_ghosty"}]});
    mockStripe.customers.update.mockResolvedValue({});
    mockStripe.paymentMethods.attach.mockResolvedValue({});
  });

  test("updates an active Pro subscription to Master instead of rejecting it",async()=>{
    mockStripe.subscriptions.list.mockResolvedValue({data:[{
      id:"sub_pro",status:"active",schedule:"sched_intro",
      metadata:{plan:"pro",billing:"monthly"},
      items:{data:[{id:"si_pro",price:{id:"price_pro_regular"}}]},
    }]});
    mockStripe.subscriptionSchedules.retrieve.mockResolvedValue({id:"sched_intro",status:"active"});
    mockStripe.subscriptionSchedules.release.mockResolvedValue({id:"sched_intro",status:"released"});
    mockStripe.subscriptions.retrieve.mockResolvedValue({id:"sub_pro",items:{data:[{id:"si_pro"}]}});
    mockStripe.subscriptions.update.mockResolvedValueOnce({id:"sub_pro"}).mockResolvedValueOnce({
      id:"sub_pro",status:"active",
      latest_invoice:{payment_intent:{client_secret:"pi_secret"}},
    });
    const req={method:"POST",body:{paymentMethodId:"pm_new",email:"qa@example.com",name:"QA",plan:"student",billing:"monthly",skipTrial:true}};
    const res=mockResponse();

    await handler(req,res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({subscriptionId:"sub_pro",clientSecret:"pi_secret",changedPlan:true});
    expect(mockStripe.subscriptionSchedules.release).toHaveBeenCalledWith("sched_intro");
    expect(mockStripe.subscriptions.update).toHaveBeenNthCalledWith(1,"sub_pro",{
      default_payment_method:"pm_new",
      cancel_at_period_end:false,
    });
    expect(mockStripe.subscriptions.update).toHaveBeenCalledWith("sub_pro",expect.objectContaining({
      items:[{id:"si_pro",price:"price_master_regular",quantity:1}],
      proration_behavior:"always_invoice",
      payment_behavior:"pending_if_incomplete",
      metadata:expect.objectContaining({plan:"student",changedFrom:"pro"}),
    }));
  });

  test("still blocks a duplicate checkout for the same plan and billing",async()=>{
    mockStripe.subscriptions.list.mockResolvedValue({data:[{
      id:"sub_pro",status:"active",schedule:null,
      metadata:{plan:"pro",billing:"monthly"},
      items:{data:[{id:"si_pro",price:{id:"price_pro_regular"}}]},
    }]});
    const req={method:"POST",body:{paymentMethodId:"pm_new",email:"qa@example.com",name:"QA",plan:"pro",billing:"monthly",skipTrial:true}};
    const res=mockResponse();

    await handler(req,res);

    expect(res.statusCode).toBe(409);
    expect(res.body.error).toMatch(/already active/i);
    expect(mockStripe.paymentMethods.attach).not.toHaveBeenCalled();
    expect(mockStripe.subscriptions.update).not.toHaveBeenCalled();
  });

  test("creates a two-cycle Master intro schedule with the new price IDs",async()=>{
    mockStripe.subscriptions.list.mockResolvedValue({data:[]});
    mockStripe.subscriptionSchedules.create.mockResolvedValue({
      subscription:{id:"sub_master",status:"active",latest_invoice:{payment_intent:null}},
    });
    const req={method:"POST",body:{paymentMethodId:"pm_new",email:"new@example.com",name:"New User",plan:"student",billing:"monthly",skipTrial:true}};
    const res=mockResponse();

    await handler(req,res);

    expect(res.statusCode).toBe(200);
    expect(mockStripe.subscriptionSchedules.create).toHaveBeenCalledWith(expect.objectContaining({
      phases:[
        {items:[{price:"price_master_intro",quantity:1}],iterations:2},
        {items:[{price:"price_master_regular",quantity:1}]},
      ],
      metadata:expect.objectContaining({plan:"student",billing:"monthly"}),
    }));
  });
});
