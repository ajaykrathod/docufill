import { Viewer, Worker } from "@react-pdf-viewer/core";
import "@react-pdf-viewer/core/lib/styles/index.css";
import { defaultLayoutPlugin } from "@react-pdf-viewer/default-layout";
import "@react-pdf-viewer/default-layout/lib/styles/index.css";


type props = {
    url:Uint8Array|string
}
const PdfViewer = ({ url }:props) => {
  const defaultLayoutPluginInstance = defaultLayoutPlugin();
  return (
    <div className="w-[78vw] h-[78vh] bg-current">
      <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.10.111/build/pdf.worker.min.js">
        <Viewer
            theme={"dark"}
            fileUrl={url}
          plugins={[defaultLayoutPluginInstance]}
        />
      </Worker>
    </div>
  );
};
export default PdfViewer;