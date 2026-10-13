import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { DraggableSlideElement, SlideFrame } from "./SlideRenderer";
import { layoutSlide, lineText, createTextMeasure } from "./slideLayout";
import * as slideLayout from "./slideLayout";
import { slidePalette } from "./slideTheme";

HTMLCanvasElement.prototype.getContext=()=>null;

const deck={
  title:"Photosynthesis: Converting Sunlight into Life",
  sources:[{id:"s1",title:"NCBI Bookshelf",url:"https://www.ncbi.nlm.nih.gov/books/NBK9861/"}],
  slides:[
    {eyebrow:"Cover",title:"Photosynthesis: Converting Sunlight into Life",supportingText:"A college-level exploration of the process.",bullets:[],visualType:"hero-image",layout:"left-third",sourceUrls:[]},
    {eyebrow:"Why it matters",title:"Why Photosynthesis Matters",supportingText:"",bullets:["The engine of all life: Photosynthesis is the ultimate source of metabolic energy.","Global oxygen supply: Every breath we take is made possible by photosynthetic organisms."],visualType:"image-cards",layout:"right-third",sourceUrls:["https://www.ncbi.nlm.nih.gov/books/NBK9861/"]},
    {isSources:true,title:"Sources",bullets:[],visualType:"sources",layout:"top-third"},
  ],
};
const palette=slidePalette("#0f1140","editorial","#f8fbff");

describe("SlideFrame",()=>{
  test("renders every slide type on a fixed design stage",()=>{
    const {container,rerender}=render(<SlideFrame deck={deck} slide={deck.slides[0]} index={0} palette={palette} font="Poppins" titleSize={34} bodySize={18}/>);
    const title=screen.getByText("Photosynthesis:").closest('[data-slide-line="true"]').parentElement;
    expect(Array.from(title.querySelectorAll('[data-slide-line="true"]'),line=>line.textContent).join(" ")).toBe("Photosynthesis: Converting Sunlight into Life");
    const stage=container.querySelector('[data-slide-stage="true"]');
    expect(stage).toHaveStyle({width:"1600px",height:"900px"});
    rerender(<SlideFrame deck={deck} slide={deck.slides[1]} index={1} palette={palette} font="Poppins" titleSize={34} bodySize={18}/>);
    expect(screen.getByText("The engine of all life")).toBeInTheDocument();
    expect(screen.getByText(/Sources 1/)).toBeInTheDocument();
    rerender(<SlideFrame deck={deck} slide={deck.slides[2]} index={2} palette={palette} font="Poppins" titleSize={34} bodySize={18}/>);
    expect(screen.getByRole("link",{name:"NCBI Bookshelf"})).toHaveAttribute("href","https://www.ncbi.nlm.nih.gov/books/NBK9861/");
  });

  test("lets the user type directly into text and reports edits",()=>{
    const onUpdateSlideField=jest.fn();const onUpdateSlideBullet=jest.fn();
    const {container}=render(<SlideFrame deck={deck} slide={deck.slides[1]} index={1} palette={palette} font="Poppins" titleSize={34} bodySize={18} editing selectedElement="text:title" onSelectElement={jest.fn()} onUpdateElementPosition={jest.fn()} onUpdateSlideField={onUpdateSlideField} onUpdateSlideBullet={onUpdateSlideBullet}/>);
    const editable=container.querySelectorAll('[contenteditable="true"]');
    expect(editable.length).toBeGreaterThanOrEqual(2);
    const title=Array.from(editable).find(node=>node.textContent==="Why Photosynthesis Matters");
    title.textContent="Why It Matters";
    fireEvent.blur(title);
    expect(onUpdateSlideField).toHaveBeenCalledWith("title","Why It Matters");
    expect(screen.getByRole("group",{name:/Title/})).toBeInTheDocument();
  });

  test("shows the fullscreen control when a handler is supplied",()=>{
    const onFullscreen=jest.fn();
    render(<SlideFrame deck={deck} slide={deck.slides[0]} index={0} palette={palette} font="Poppins" onFullscreen={onFullscreen}/>);
    fireEvent.click(screen.getByRole("button",{name:/Present slides in fullscreen/}));
    expect(onFullscreen).toHaveBeenCalled();
  });

  test("previews the same wrapped lines used in exported slides",()=>{
    const slide={...deck.slides[0],supportingText:"First line\nSecond line"};
    const {container}=render(<SlideFrame deck={deck} slide={slide} index={0} palette={palette} font="Poppins"/>);
    const layout=layoutSlide(deck,slide,0,{palette,font:"Poppins",measure:createTextMeasure()});
    const body=layout.groups.body.blocks.find(block=>block.field==="supportingText");
    const first=screen.getByText("First line").closest('[data-slide-line="true"]').parentElement;
    expect(Array.from(first.querySelectorAll('[data-slide-line="true"]'),line=>line.textContent)).toEqual(body.lines.map(lineText));
    expect(container.querySelector('[data-slide-line="true"]')).toHaveStyle({whiteSpace:"pre"});
  });

  test.each(["image-cards","takeaway-grid","icon-columns"])("edits both parts of split bullets in %s",visualType=>{
    const onUpdateSlideBullet=jest.fn();
    const slide={...deck.slides[1],visualType,bullets:["Location: Inside the cell"]};
    render(<SlideFrame deck={deck} slide={slide} index={1} palette={palette} editing onUpdateSlideBullet={onUpdateSlideBullet}/>);
    const label=screen.getByText("Location");
    expect(label).toHaveAttribute("contenteditable","true");
    label.textContent="Site";fireEvent.blur(label);
    expect(onUpdateSlideBullet).toHaveBeenLastCalledWith(0,"Site: Inside the cell");
    const detail=screen.getByText("Inside the cell");
    detail.textContent="Inside the leaf";fireEvent.blur(detail);
    expect(onUpdateSlideBullet).toHaveBeenLastCalledWith(0,"Location: Inside the leaf");
  });

  test("handles each resize movement once and stops when pointer capture is lost",()=>{
    const onChange=jest.fn();
    render(<div><DraggableSlideElement position={{x:10,y:20,width:30}} editing selected label="Title" onChange={onChange}>Title</DraggableSlideElement></div>);
    const handle=screen.getByRole("button",{name:"Resize Title"});
    fireEvent.pointerDown(handle,{pointerId:1,clientX:10,clientY:10});
    fireEvent.pointerMove(handle,{pointerId:1,clientX:20,clientY:20});
    expect(onChange).toHaveBeenCalledTimes(1);
    fireEvent.lostPointerCapture(handle,{pointerId:1});
    fireEvent.pointerMove(handle,{pointerId:1,clientX:30,clientY:30});
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  test("remeasures every visible slide after fonts load with one shared listener",()=>{
    const originalFonts=Object.getOwnPropertyDescriptor(document,"fonts");
    const fonts=new EventTarget();
    const subscribe=jest.spyOn(fonts,"addEventListener");const unsubscribe=jest.spyOn(fonts,"removeEventListener");
    Object.defineProperty(document,"fonts",{configurable:true,value:fonts});
    const layout=jest.spyOn(slideLayout,"layoutSlide");
    let unmount;
    try{
      ({unmount}=render(<><SlideFrame deck={deck} slide={deck.slides[0]} index={0} palette={palette}/><SlideFrame deck={deck} slide={deck.slides[1]} index={1} palette={palette}/></>));
      expect(subscribe).toHaveBeenCalledTimes(1);
      const before=layout.mock.calls.length;
      act(()=>fonts.dispatchEvent(new Event("loadingdone")));
      expect(layout.mock.calls.length).toBe(before+2);
      unmount();unmount=null;
      expect(unsubscribe).toHaveBeenCalledTimes(1);
    }finally{
      unmount?.();layout.mockRestore();
      if(originalFonts)Object.defineProperty(document,"fonts",originalFonts);else delete document.fonts;
    }
  });
});
