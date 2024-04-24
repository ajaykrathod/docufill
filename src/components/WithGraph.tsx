import { memo, ReactNode, Suspense, useCallback, useEffect, useState } from "react";

import { useFullscreen, useIsProUser } from "../lib/hooks";
import { useUnmountStore } from "../lib/useUnmountStore";
import { CloneButton } from "./CloneButton";
import Graph from "./Graph";
import GraphWrapper from "./GraphWrapper";
import Loading from "./Loading";
import styles from "./WithGraph.module.css";
import TabPane from "./TabPane";
import { useMobileStore } from "../lib/useMobileStore";
import { useTabsStore } from "../lib/useTabsStore";
import { useFlowStore } from "../lib/useFlowStore";

type MainProps = {
  children?: ReactNode;
};

/** The left/right column wrapper. Also controls when things should be fullscreen. */
const WithGraph = memo(({ children }: MainProps) => {
  const [shouldResize, triggerResize] = useState(0);
  const [visibleFlow, setVisibleFlow] = useState(false)
  const trigger = useCallback(() => triggerResize((n) => n + 1), []);
  const isFullscreen = useFullscreen();
  const unmount = useUnmountStore((state) => state.unmount);
  
  const isProUser = useIsProUser();
  const tab = useMobileStore((state) => state.tab);
  const selectedTab = useTabsStore((state) => state.selectedTab);

  useEffect(() =>{
    if(visibleFlow){
      triggerResize(0)
    }
    else {
      triggerResize(50)
    }
  },[visibleFlow])
  return (
    <div
      className="relative grid grid-rows-[[main]_minmax(0,1fr)_auto] grid-cols-[[main]_minmax(0,1fr)] md:flex md:shadow-xl"
      data-mobile-tab={tab}
      data-selected-tab={selectedTab}
    >
      
      {!visibleFlow ? null : (
        <TabPane triggerResize={trigger}>
          <Suspense fallback={<Loading />}>{children}</Suspense>
        </TabPane>
      )}
      <GraphWrapper>
        {unmount ? <Loading /> : <Graph visibleFlow={visibleFlow} shouldResize={shouldResize} setVisibleFlow={setVisibleFlow} />}
        {isFullscreen && isProUser ? (
          <div className={styles.CopyButtonWrapper}>
            <CloneButton />
          </div>
        ) : null}
      </GraphWrapper>
    </div>
  );
});

WithGraph.displayName = "Main";

export default WithGraph;
