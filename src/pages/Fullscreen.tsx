import { useQuery } from "react-query";
import Graph from "../components/Graph";
import { useLocation, useParams } from "react-router-dom";
import { loadReadOnly } from "./ReadOnly";
import { useState } from "react";

export default function Fullscreen() {
  const { pathname } = useLocation();
  const [visibleFlow, setVisibleFlow] = useState(false)
  const { graphText = window.location.hash.slice(1) } = useParams<{
    graphText: string;
  }>();
  useQuery(
    ["read", pathname, graphText],
    () => loadReadOnly(pathname, graphText),
    {
      enabled: typeof graphText === "string",
      suspense: true,
      staleTime: 0,
    } 
  );
  return <Graph visibleFlow={visibleFlow} shouldResize={0} setVisibleFlow={setVisibleFlow}/>;
}
