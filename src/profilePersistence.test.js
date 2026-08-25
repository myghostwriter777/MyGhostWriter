import {loadSavedProfile,mergeSavedProfile,profileStorageKey,saveProfile} from "./profilePersistence";

const memoryStorage=()=>{const values=new Map();return{getItem:key=>values.has(key)?values.get(key):null,setItem:(key,value)=>values.set(key,String(value))};};

describe("profile persistence",()=>{
  test("keys profiles by normalized email",()=>expect(profileStorageKey(" Name@Example.COM ")).toBe("gwm2_profile_name@example.com"));

  test("restores a custom name and uploaded avatar after sign-in",()=>{
    const storage=memoryStorage();saveProfile({email:"me@example.com",name:"My chosen name",avatar:"data:image/webp;base64,abc"},storage);
    expect(mergeSavedProfile({email:"ME@example.com",name:"Google Name",avatar:"https://google/avatar"},storage)).toMatchObject({name:"My chosen name",avatar:"data:image/webp;base64,abc"});
  });

  test("ignores corrupt saved data",()=>{
    const storage=memoryStorage();storage.setItem(profileStorageKey("me@example.com"),"not json");expect(loadSavedProfile("me@example.com",storage)).toBeNull();
  });
});
