import { ChangeEvent, MouseEvent, lazy, useEffect, useState } from "react";
import ChatComponent from "./ChatComponent";
import axios from "axios";
import PdfViewer from "./PDFViewer";
import { FaAngleDoubleLeft } from "react-icons/fa";
import { RiMenuUnfoldLine } from "react-icons/ri";
import { BiSolidSend } from "react-icons/bi";
import { RiChatNewFill } from "react-icons/ri";
import { BsEscape } from "react-icons/bs";
import { HiDotsHorizontal } from "react-icons/hi";
import { auth, db } from "../utils/firebase";
import { FaShare } from "react-icons/fa6";
import { MdDelete } from "react-icons/md";
import { FaRegStopCircle } from "react-icons/fa";
import { v4 as uuidv4 } from 'uuid';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  deleteDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { getCanvas } from "./downloads";
import { AUTH_IMG_SCALE } from "../lib/constants";
import { VscOpenPreview } from "react-icons/vsc";
import { MdOutlineFileDownload } from "react-icons/md";
import { TbLogout } from "react-icons/tb";
import { signOut } from "firebase/auth";

import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';


const Sandbox = lazy(() => import("../pages/Sandbox"));
const scale = AUTH_IMG_SCALE;

export default function Home() {
  const [prompt, setPrompt] = useState<string>("");
  const [output, setOutput] = useState<string>("");
  const [complete, setComplete] = useState<boolean>(false);
  const [previewed, setPreviewed] = useState<boolean>(false);
  const [isDecided, setIsDecided] = useState<boolean>(false)
  const [isResearchPaper, setIsResearchPaper] = useState<boolean>(false)
  const [promptSubmitted, setPromptSubmitted] = useState<boolean>(false)
  const [title, setTitle] = useState<string>("");
  const [paperType, setPaperType] = useState<string>("")
  const [pdfUrl, setPdfUrl] = useState<Uint8Array|string>();
  const [showMenu, setShowMenu] = useState<boolean>(true);
  const [newChat, setNewChat] = useState<boolean>(true);
  const [chatID, setChatID] = useState<string>("");
  const [chatUID, setChatUID] = useState<string>("")
  const [menuMouseEntered, setMenuMouseEntered] = useState(false);
  const [chatInterrupted, setChatInterrupted] = useState<boolean>(false)
  const [previousInterrupted, setPreviousInterrupted] = useState<boolean>(false)
  const [chatMenu, setChatMenu] = useState<{ id: string; title: string; chatID:string; }[]>([
    {
      id: "",
      title: "",
      chatID:""
    },
  ]);
  const [sections, setSections] = useState<any[][]>([
    ["Abstract", 400],
    ["Introduction", 900],
    ["Related Work", 700],
    ["Proposed Method", 1000],
    ["Diagram", 0],
    ["Experiments", 600],
    ["Conclusion", 400],
  ]);
  const [streaming, setStreaming] = useState<boolean>(false)
  const [ind, setInd] = useState<number>(0);
  const [chats, setChats] = useState<
    {
      prompt: string;
      output: any;
      diagram: boolean;
      section: string;
      ind: number;
      interrupted:boolean;
    }[]
  >([{ prompt: "", output: "", diagram: false, section: "", ind: 0, interrupted:false }]);
  const [chatChosen, setChatChosen] = useState<string>("")
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>,id:string) => {
    setAnchorEl(event.currentTarget);
    setChatChosen(id)
  };
  const handleClose = () => {
    setAnchorEl(null);
  };


  const deleteChat = async () => {
    if(auth.currentUser?.uid){
      await deleteDoc(doc(db, auth.currentUser.uid, chatChosen));
      setChatMenu(prev => {
        let prevChats = [...prev]
        return prevChats.filter(chat => chat.id != chatChosen)
      })
    }
  }


  const interruptChat = async () => {
    setStreaming(false)
    setChatInterrupted(true)
    setPreviousInterrupted(true)
    setChats((prev) => {
      const newChats = [...prev];
      const lastObj = newChats[newChats.length - 1];
      lastObj.interrupted = true;
      return newChats;
    });
    const data = {
      chatID:chatUID
    }
    const options = {
      method: "POST",
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    };
    await fetch(`${process.env.REACT_APP_BACKEND_URL}/interrupt`,options)
  }

  const fetchData = async (
    section: any,
    index: number,
    msg: string,
    file_name: string,
    token: any,
    chatID:string
  ) => {
    const data = {
      section: section,
      prompt: msg,
      file_name: file_name,
      token: token,
      chatID:chatID
    };

    console.log("chatID",chatID);
    

    const options = {
      method: "POST",
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    };
    const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/stream_words`, options);

    if (response.body) {
      const reader = response.body.getReader();
      setStreaming(true)
      let word = "";

      /* eslint-disable no-constant-condition */
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const char of new TextDecoder().decode(value)) {
          if (char === " ") {
            if (word.length > 0) {
              const currWord = word;
              if (currWord == "<END>") {
                setComplete(true);
                setStreaming(false)
                setPreviousInterrupted(false)
                setChats((prev) => {
                  return [
                    ...prev,
                    {
                      prompt: "",
                      output: "",
                      diagram: false,
                      section: "",
                      ind: 0,
                      interrupted:false
                    },
                  ];
                });
              } 
              else {
                setChats((prev) => {
                  const newChats = [...prev];
                  const lastObj = newChats[newChats.length - 1];

                  let splitOutput = lastObj.output.split(" ");
                  if (splitOutput.at(-2) != currWord && currWord != "<INTR>") {
                    lastObj.output += currWord + " ";
                  }
                  lastObj.section = sections[index][0];
                  lastObj.ind = index;
                  lastObj.interrupted = currWord == "<INTR>" ? true : false;
                  return newChats;
                });
              }
            }
            word = "";
          } else {
            word += char;
          }
        }
      }
    }
    const authID = auth.currentUser?.uid;
    if (authID) {
      const tempTitle = msg.replace(`Generate ${section} on `, "");
      const q = query(collection(db, authID), where("title", "==", tempTitle));
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach(async (document) => {
        setChatID(document.id);
        await updateDoc(doc(db, authID, document.id), {
          complete:chats.at(-1)?.section == "Conclusion",
          chat: chats,
        });
      });
    }
  };

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(e.target.value);
  };

  async function fetchChats() {
    setChatMenu([
      {
        id: "",
        title: "",
        chatID:""
      },
    ]);
    const currUserUID = localStorage.getItem("UID");

    if (currUserUID) {
      const querySnapshot = await getDocs(collection(db, currUserUID));
      querySnapshot.forEach((doc) => {
        setChatMenu((prev) => {
          const newChats = [...prev];
          const lastObj = newChats[newChats.length - 1];
          if (newChats.length > 1 && newChats.at(-2)?.id == doc.id) {
            return newChats;
          } else {
            lastObj.id = doc.id;
            lastObj.title = doc.data().title;
            lastObj.chatID = doc.data().chatID;
            newChats.push({ id: "", title: "",chatID:"" });
            return newChats;
          }
        });
      });
    }
  }
  useEffect(() => {
    fetchChats();
  }, [auth.currentUser]);

  const fetchDiagram = (msg: string, index: number) => {
    const code = `
    Stock Price Prediction
        Data Collection .color_green
            Historical Stock Prices
            Market News & Events
            Company Financials
        Data Preprocessing .color_green
            Cleaning & Handling Missing Values
            Normalization & Feature Engineering
        Feature Selection .color_green
            Identify Most Relevant Features
            Reduce Redundancy
        Model Training .color_blue
            Choose Prediction Model
            Train Model on Preprocessed Data
        Model Evaluation .color_blue
            Measure Prediction Accuracy e.g., RMSE, MAPE
        -> If Accuracy Meets Criteria: Prediction .color_blue
            Use Trained Model to Predict Future Prices
                Provide Prediction with Confidence Score
        -> If Accuracy Doesn't Meet Criteria: Investigate Model Issues or Re-train`;
    const myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");

    const raw = JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: `Generate flow chart code for ${msg} using syntax like following example where each indentation represents relationship, we can specify appearance just take an example ${code}`,
            },
          ],
        },
      ],
    });

    const requestOptions = {
      method: "POST",
      headers: myHeaders,
      body: raw,
      // redirect: "follow"
    };

    fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.REACT_APP_GEMINI_KEY}`,
      requestOptions
    )
      .then((response) => response.json())
      .then((result) => {
        console.log(result);
        setChats((prev) => {
          const newChats = [...prev];
          const lastObj = newChats[newChats.length - 1];
          lastObj.output = result.candidates[0]["content"]["parts"][0]["text"];
          lastObj.diagram = true;
          lastObj.ind = index;
          lastObj.section = "Diagram";
          newChats.push({
            prompt: "",
            output: "",
            diagram: false,
            section: "",
            ind: -1,
            interrupted:false
          });
          return newChats;
        });

        setComplete(true);
        // useDoc.setState({text:result.candidates[0]["content"]["parts"][0]["text"]},false, "Edit/text")
      })
      .catch((error) => console.error(error));
  };

  const handleSubmit = async (
    tempDecided:boolean = false,
    type:string="",
    tempPrompt: string = "",
    tempInd: number = -1,
    existingChat: boolean = false
  ) => {
    if(!prompt && !tempPrompt) return
    if(!tempDecided && !isDecided) {
      setPromptSubmitted(true)
      return
    }

    let idChat:string = ""
    
    if (!existingChat && newChat) {
      // setChatID(chatUID)
      if (auth.currentUser?.uid) {
        let chatUID = uuidv4()
        const docRef = await addDoc(collection(db, auth.currentUser.uid), {
          title: prompt,
          chatUID:chatUID,
          lastUpdated: Date.now(),
          type: (tempDecided || isDecided) && type ,
          complte:false,
          chat: []
        });
        setChatUID(chatUID);
        idChat = chatUID
        setChatID(docRef.id);
      }
      setNewChat(false);
      fetchChats();
    }
    let msg = prompt ? prompt : tempPrompt;
    let index = tempInd > -1 ? tempInd : ind;
    if(!idChat) idChat = chatUID
    if (index < sections.length) {
      if (sections[index][0] == "Diagram") {
        setInd(index + 1);
        fetchDiagram(msg, index);
        return;
      }
      msg = `${sections[index][0]} on ${prompt ? prompt : title}`;
      if (!title) {
        setTitle(prompt);
      }
      const newChats = [...chats];
      newChats[newChats.length - 1].prompt = msg;
      setChats(newChats);
      setPrompt("");
      if((title.length > 0 || prompt.length > 0) && idChat.length > 0){
        await fetchData(
          sections[index][0].replaceAll(" ", ""),
          ind,
          `Generate ${sections[index][0]} on ${title ? title : prompt}`,
          `${
            title ? title.replaceAll(" ", "") : prompt.replaceAll(" ", "")
          }.docx`,
          sections[index][1],
          idChat
        );
        setInd((prev) => prev + 1);
      }
    }
  };

  const handleSatisfied = (e: MouseEvent<HTMLButtonElement>) => {
    setComplete(false);
    setStreaming(true)
    setChatInterrupted(false)
    handleSubmit();
  };

  function replacer(key: any, value: any) {
    // Check if the value is a base64 encoded string
    if (typeof value === "string" && value.startsWith("data:image")) {
      return { base64: true, data: value };
    }
    return value;
  }

  const generatePDFData = async (
    copyChats: {
      prompt: string;
      output: any;
      diagram: boolean;
      section: string;
      ind: number;
    }[]
  ) => {
    let allChats: {
      prompt: string;
      output: any;
      diagram: boolean;
      section: string;
      ind: number;
    }[] = [];
    copyChats.map((chat, ind) => {
      allChats.push({
        diagram: chat.diagram,
        ind: chat.ind,
        output: chat.output,
        prompt: chat.prompt,
        section: chat.section.replace(" ",""),
      });
    });
    let originalChats = chats;
    let diagram = "";
    let canvas!: {
      canvas: HTMLCanvasElement;
      type: "png" | "jpg";
      cleanup: () => void;
    };
    if (window.__cy) {
      canvas = await getCanvas({
        cy: window.__cy,
        type: "png",
        scale,
      });
      let base64String = canvas.canvas.toDataURL("image/png");
      for (let i = 0; i < allChats.length; i++) {
        if (allChats[i].diagram == true) {
          allChats[i].output = base64String;
          diagram = base64String;
          break;
        }
      }
      // const formData = new FormData();
      let blobChats: {
        prompt: string;
        output: any;
        diagram: boolean;
        section: string;
        ind: number;
      }[] = [];
      allChats.map((chat, ind) => {
        blobChats.push(chat);
      });

      // formData.append('canvasImage', blob, 'canvasImage.png');
      const data = {
        title:title?title:prompt,
        file_name: `${
          title ? title.replaceAll(" ", "") : prompt.replaceAll(" ", "")
        }`,
        chats: blobChats,
        type:paperType
      };

      setChats(originalChats);
      return data;
    } else {
      return {
        title:title?title:prompt,
        file_name: `${
          title ? title.replaceAll(" ", "") : prompt.replaceAll(" ", "")
        }`,
        chats: allChats,
        type:paperType
      };
    }
  };


  const fetchPdfFile = async () => {
    if(!chatID) return
    try {
      const copyChats = [...chats];
      generatePDFData(copyChats).then(async (data) => {
        const requestOptions = {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            // Add any other headers if needed
          },
          data: data, // JSON data as the request body
        };

        // Make POST request to the server to convert the file to PDF
        const response = await axios.post(
          `${process.env.REACT_APP_BACKEND_URL}/getFile`,
          requestOptions,
          {
            responseType: "blob",
          }
        );
        // const wordArray = new Uint8Array(response.data);
        // const pdfBase64 = btoa(
        //   new Uint8Array(response.data)
        //     .reduce((data, byte) => data + String.fromCharCode(byte), '')
        // );
        // const blob = base64toBlob(pdfBase64);
        // const url = URL.createObjectURL(blob);
        // setPdfUrl(wordArray);
        const pdfBlob = new Blob([response.data], { type: "application/pdf" });
        const url = URL.createObjectURL(pdfBlob);
        setPreviewed(true);
        setPdfUrl(url);
      });
    } catch (error) {
      console.error("Error fetching PDF file:", error);
    }
  };

  const handleNewPaper = async() => {
    const authID = auth.currentUser?.uid

    if(streaming && authID){
      await updateDoc(doc(db, authID, chatID), {
        complete:false,
        chat: chats,
      });
    }
    setStreaming(false)
    setNewChat(true);
    setChats([
      {
        diagram: false,
        output: "",
        prompt: "",
        ind: 0,
        section: "",
        interrupted:false
      },
    ]);
    setChatID("");
  };

  const handleChatItemClick = async (id: string) => {
    const authID = auth.currentUser?.uid

    if(streaming && authID){
      await updateDoc(doc(db, authID, chatID), {
        complete:false,
        chat: chats,
      });
    }
    setStreaming(false)
    if (auth.currentUser?.uid) {
      const docSnap = await getDoc(doc(db, auth.currentUser?.uid, id));

      if (docSnap.exists()) {
        const allChats: {
          prompt: string;
          output: string;
          diagram: boolean;
          section: string;
          ind: number;
          interrupted:boolean;
        }[] = docSnap.data().chat;
        setTitle(docSnap.data().title);
        setPaperType(docSnap.data().type);
        setNewChat(false);
        setChatID(docSnap.id);
        setChatUID(docSnap.data().chatUID)

        const lastChat = allChats.at(-1);
        if(lastChat?.interrupted){
          setPreviousInterrupted(true)
        }
        if (lastChat?.ind) setInd(lastChat?.ind + 1);
        // setPrompt(docSnap.data().title)
        setChats(allChats);
        if (lastChat && allChats.length < sections.length && !lastChat.interrupted) {
          setChats((prev) => {
            return [
              ...prev,
              { prompt: "", output: "", diagram: false, section: "", ind: 0,interrupted:false },
            ];
          });
          handleSubmit(true,"",docSnap.data().title, lastChat.ind + 1, true);
        }
      }
    }
  };

  const donwloadFile = () => {
    if(!chatID) return
    const file_name = `${
      title ? title.replaceAll(" ", "") : prompt.replaceAll(" ", "")
    }`

    const copyChats = [...chats];
    generatePDFData(copyChats).then(async (data) => {
    const requestOptions = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Add any other headers if needed
      },
      data: data
    };

    axios
      .post(`${process.env.REACT_APP_BACKEND_URL}/downloadFile`, requestOptions, {
        responseType: "blob"
      })
      .then((res) => {
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", file_name+".docx");
        document.body.appendChild(link);
        link.click();
        link.remove();
      });
    })
  };

  const continueChat = () => {
    setChats((prev) => {
      const newChats = [...prev];
      let lastChat = newChats.at(-1)
      if(lastChat){
        lastChat.output = ""
        lastChat.interrupted = false
      }
      return newChats
    });
    const lastChat = chats.at(-1)
    
    
    if(lastChat){
      handleSubmit(true,paperType,title, lastChat.ind, true);
    }
    setPreviousInterrupted(false)
  }



  const logout = async() => {
    await signOut(auth)
    localStorage.removeItem("UID")
    window.location.href = "login"
  }
  return (
    <main className="flex min-h-screen flex-col justify-between overflow-hidden">
      <div className="absolute top-0 left-[5vh] w-[90vw] h-[7vh] flex justify-between items-center text-[1.7em] font-medium">
        <div role="presentation" onClick={() => setShowMenu(true)}>
          {!showMenu && <RiMenuUnfoldLine size={30} />}
        </div>
        <div className="font-bold text-[1.3em]">Docufill</div>
        <div className="flex gap-8">
          {previewed ? (
            <button
              className="text-white flex border px-3 py-2 text-[0.8em] items-center gap-3 font-semibold rounded-md"
              onClick={() => setPreviewed(false)}
            >
              Escape
              <BsEscape size={22} color="white" />
            </button>
          ) : (
            <button
              disabled={chatID ? false:true}
              className="text-white flex border px-3 py-2 text-[0.8em] items-center gap-2 font-semibold rounded-md"
              onClick={fetchPdfFile}
            >
              Preview
              <VscOpenPreview size={22} color="white" />
            </button>
          )}
          <button onClick={donwloadFile} disabled={chatID ? false:true}>
            <MdOutlineFileDownload size={25} color="white" />
          </button>
          <button onClick={logout}>
            <TbLogout size={25} color="white" />
          </button>
        </div>
      </div>
      <div className="min-w-[100vw] flex">
        {showMenu && (
          <div
            role="presentation"
            className={`${
              showMenu ? "w-[20vw]" : "w-[0vw]"
            }  duration-500 transition-all  min-h-[100vh] border-r-2 py-5 flex flex-col`}
            onMouseLeave={() => setMenuMouseEntered(false)}
            onMouseEnter={() => {
              setMenuMouseEntered(true);
            }}
          >
            <button
              className="flex z-10 w-[20vw] text-center font-semibold text-[1.3em] my-4 gap-4 justify-center items-center py-2"
              onClick={handleNewPaper}
            >
              New Paper <RiChatNewFill />
            </button>
            <div>
              {chatMenu.map((chat, ind) => {
                if (ind < chatMenu.length - 1) {
                  return (
                    <div
                      className="w-[18vw] m-2 text-center items-center text-[1.2em] cursor-pointer flex justify-around "
                      key={chat.id}
                      aria-hidden="true"
                    >
                      <div aria-hidden="true" className="w-[80%] m-2 text-center py-2" 
                      onClick={() => handleChatItemClick(chat.id)}>
                        {chat.title}
                      </div>
                      <div role="presentation"  onClick={(e)=> handleClick(e,chat.id)}>
                        <HiDotsHorizontal size={20}/>
                      </div>
                      <Menu
                              anchorEl={anchorEl}
                              id="account-menu"
                              open={open}
                              onClose={handleClose}
                              onClick={handleClose}
                              PaperProps={{
                                elevation: 0,
                                sx: {
                                  overflow: 'visible',
                                  filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
                                  mt: 1.5,
                                  '& .MuiAvatar-root': {
                                    width: 32,
                                    height: 32,
                                    ml: -0.5,
                                    mr: 1,
                                  },
                                  '&::before': {
                                    content: '""',
                                    display: 'block',
                                    position: 'absolute',
                                    top: 0,
                                    right: 14,
                                    width: 10,
                                    height: 10,
                                    bgcolor: 'background.paper',
                                    transform: 'translateY(-50%) rotate(45deg)',
                                    zIndex: 0,
                                  },
                                },
                              }}
                              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                            >
                              <MenuItem onClick={deleteChat}>
                                <ListItemIcon>
                                  <MdDelete  />
                                </ListItemIcon>
                                Delete Chat
                              </MenuItem>
                              {/* <MenuItem onClick={handleClose}>
                                <ListItemIcon>
                                  <FaShare />
                                </ListItemIcon>
                                Share
                              </MenuItem> */}
                            </Menu>
                    </div>
                  );
                }
              })}
            </div>
          </div>
        )}
        {showMenu && (
          <div
            role="presentation"
            className="absolute left-[21vw] top-[45vh]"
            onMouseLeave={() => setMenuMouseEntered(false)}
            onMouseEnter={() => {
              setMenuMouseEntered(true);
            }}
          >
            <FaAngleDoubleLeft
              color={`${menuMouseEntered ? "white" : "gray"}`}
              size={25}
              onClick={() => setShowMenu(false)}
            />
          </div>
        )}
        <div
          className="w-[80vw] p-10 m-auto mt-[10vh] flex flex-col gap-3 h-[80vh] overflow-auto"
          id="chatContainer"
        >
          {!isDecided  && promptSubmitted && (
            <div className="flex gap-3 items-center">
              Is this Research Paper or Normal Report
              <button
                className="bg-gray-500 px-4 py-2 rounded-md"
                onClick={() => {
                  setIsDecided(true)
                  setPaperType("Reseach Paper")
                  setIsResearchPaper(true)
                  handleSubmit(true,"Reseach Paper")
                }}
              >
                Research Paper
              </button>
              <button onClick={() => {
                setIsDecided(true)
                setPaperType("Report")
                setIsResearchPaper(false)
                handleSubmit(true,"Report")
              }} className="bg-gray-500 px-4 py-2 rounded-md">Report</button>
            </div>
          )}
          {previewed && pdfUrl && <PdfViewer url={pdfUrl} />}
          {chats.map((chat, index) => (
            <ChatComponent
              prompt={chat.prompt}
              chatID={chatID}
              output={chat.output}
              diagram={chat.diagram}
              key={index}
              ind={index}
              setChats={setChats}
            />
          ))}
          {previousInterrupted && (
            <div className="flex gap-3 items-center">
              Complete Previous Chat Or Skip
              <button
                className="bg-gray-500 px-4 py-2 rounded-md"
                onClick={continueChat}
              >
                Complete
              </button>
              <button className="bg-gray-500 px-4 py-2 rounded-md" onClick={handleSatisfied}>Skip</button>
            </div>
          )}
          {complete && (
            <div className="flex gap-3 items-center">
              Is this helpful
              <button
                className="bg-gray-500 px-4 py-2 rounded-md"
                onClick={handleSatisfied}
              >
                Yes
              </button>
              <button className="bg-gray-500 px-4 py-2 rounded-md">No</button>
            </div>
          )}
        </div>
      </div>
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm lg:flex">
        <textarea
          name=""
          id=""
          disabled={complete}
          className="absolute bottom-10 left-[30vw] m-auto bg-gray-700 rounded-full outline-none text-[1.5em] px-5 py-3 h-[5vh] w-[30vw] overflow-hidden resize-none"
          value={prompt}
          onChange={handleChange}
        ></textarea>
        <button
          disabled={complete}
          className="absolute bottom-10 right-[38vw] rounded-full h-[5vh] p-3 w-10"
          onClick={() => streaming ? interruptChat() : handleSubmit()}
        >
          {streaming ? <FaRegStopCircle size={30}/> : <BiSolidSend size={30} />}
        </button>
      </div>
    </main>
  );
}
