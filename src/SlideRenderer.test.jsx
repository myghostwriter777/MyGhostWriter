import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { SlideFrame } from "./SlideRenderer";
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
    expect(screen.getByText("Photosynthesis: Converting Sunlight into Life")).toBeInTheDocument();
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
});
