import { create } from "zustand";

/**
 * This store is used to trigger unmounting of the graph
 * when the user clicks the reset button
 */
export const useFlowStore = create<{
  visible: boolean;
}>(() => ({
  visible: false,
}));

/**
 * Unmounts the graph
 */
export function showFlowEditor() {
  useFlowStore.setState({
    visible: true,
  });
}

/**
 * Mounts the graph again
 */
export function hideFlowEditor() {
  useFlowStore.setState({
    visible: false,
  });
}

