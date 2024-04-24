import React, {
  Dispatch,
  SetStateAction,
  SyntheticEvent,
  lazy,
  useState,
} from "react";
import ParaphraseMenu from "./ParaphraseMenu";
import { doc, updateDoc } from "firebase/firestore";
import { auth, db } from "../utils/firebase";

const Sandbox = lazy(() => import("../pages/Sandbox"));

type props = {
  prompt: string;
  output: string;
  diagram:boolean;
  ind: number;
  chatID:string;
  setChats: Dispatch<SetStateAction<{ prompt: string; output: string, diagram:boolean,section:string,ind:number }[]>>;
};

function ChatComponent(props: props) {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const [selectedText, setSelectedText] = useState<string>("");
  const open = Boolean(anchorEl);
  const handleClick = (selectedText: string) => {
    fetchData(selectedText);
    handleClose();
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  function replaceSubstringIgnoreCaseAndSpaces(
    originalString: string,
    substringToReplace: string,
    newSubstring: string
  ) {
    // Remove spaces and convert both strings to lowercase
    let formattedOriginal = originalString.replace("  ", "");
    let formattedSubstring = substringToReplace.replace("  ", "");

    // Use regular expression with 'i' flag for case-insensitive search
    let regex = new RegExp(formattedSubstring, "gi");

    let resultString = formattedOriginal.replace(
      formattedSubstring,
      newSubstring
    );

    return resultString;
  }
  const fetchData = async (msg: string) => {
    const data = {
      message: msg,
    };

    const options = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    };
    const response = await fetch("http://127.0.0.1:5000/paraphrase", options);

    if (response.body != null) {
      const reader = response.body.getReader();
      let word = "";
      let wordQueue: string = "";
      /* eslint-disable no-constant-condition */
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        let values = JSON.parse(new TextDecoder().decode(value));
        if (values[0]) {
          wordQueue = values[0]["generated_text"];
        }
      }
      props.setChats((prev) => {
        const newChats = [...prev];
        const lastObj = newChats[props.ind];

        lastObj.output = replaceSubstringIgnoreCaseAndSpaces(
          lastObj.output,
          selectedText,
          wordQueue
        );

        return newChats;
      });
    }
  };

  function getSelectedTextNode() {
    let selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      let range = selection.getRangeAt(0);
      let container = range.commonAncestorContainer;

      // Traverse up the DOM tree to find the nearest element with a class
      while (container && container.parentNode) {
        if (container.nodeType === 1 && container instanceof HTMLElement) {
          return container;
        }
        container = container.parentNode;
      }
    }
    return null;
  }

  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection) {
      setSelectedText(selection.toString());
      const node = getSelectedTextNode();
      setTimeout(() => {
        setAnchorEl(node);
      }, 3000);

      // setSelectedText(selectedText);
      // alert("rewrite??")
    }
  };

  const handleChange = async(text:string) => {
    console.log(text);
    props.setChats(prev => {
      const allChats = [...prev]
      allChats[props.ind].output = text
      const currUserUID = auth.currentUser
      if(currUserUID?.uid){
        (async function() {
          await updateDoc(doc(db,currUserUID.uid,props.chatID),{
            chat: allChats
          })
        })();
      }
      return allChats
    })
    
  }
  return (
    <div className={`flex flex-col justify-center items-start`}>
      {/* eslint-disable no-constant-condition */}
      {
        props.diagram ? <Sandbox handleChange={handleChange} editorText={props.output}/> :
        <>
          <div
            className="text-[1.3em] font-medium"
            role="presentation"
            onDoubleClick={handleTextSelection}
            onMouseUp={handleTextSelection}
          >
            {props.prompt}
          </div>
          <div
            className={`text-[1.3em] font-medium`}
            role="presentation"
            onMouseUp={handleTextSelection}
          >
            {props.output}
          </div>
          
          <ParaphraseMenu
            anchorEl={anchorEl}
            handleClose={handleClose}
            open={open}
            handleClick={() => handleClick(selectedText)}
          />
        </>
      }
    </div>
  );
}

export default ChatComponent;
