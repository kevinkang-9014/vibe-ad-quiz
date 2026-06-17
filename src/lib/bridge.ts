const postBridgeMessage = (message: object) => {
  const messageStr = JSON.stringify(message);

  if (window.QandaWebView?.postMessage) {
    window.QandaWebView.postMessage(messageStr);
    return true;
  }
  if (window.webkit?.messageHandlers?.Qanda?.postMessage) {
    window.webkit.messageHandlers.Qanda.postMessage(messageStr);
    return true;
  }
  if (window.webkit?.messageHandlers?.qanda?.postMessage) {
    window.webkit.messageHandlers.qanda.postMessage(messageStr);
    return true;
  }
  return false;
};

export const getBridge = () => ({
  closeWebview: () => {
    const sent = postBridgeMessage({ name: "closeWebview" });
    if (!sent && window.history.length > 1) {
      window.history.back();
    }
  },
  openExternalBrowser: (url: string) => {
    const deeplink = `qandadir://outlink?link=${encodeURIComponent(url)}`;
    const sent = postBridgeMessage({
      name: "openDeeplink",
      parameters: { url: deeplink },
    });
    if (!sent) window.open(url, "_blank", "noreferrer");
  },
});

export const isWebView = () => {
  if (typeof window === "undefined") return false;
  return !!(
    window.QandaWebView?.postMessage ||
    window.webkit?.messageHandlers?.Qanda?.postMessage ||
    window.webkit?.messageHandlers?.qanda?.postMessage
  );
};

export function setupNativeBack(callback: () => void): () => void {
  history.pushState({ page: "webview-root" }, "");
  const onPopstate = () => callback();
  window.addEventListener("popstate", onPopstate);

  const origSetItem = sessionStorage.setItem.bind(sessionStorage);
  sessionStorage.setItem = function (key: string, value: string) {
    origSetItem(key, value);
    if (key === "navigation:back") {
      sessionStorage.removeItem(key);
      callback();
    }
  };

  return () => {
    window.removeEventListener("popstate", onPopstate);
    sessionStorage.setItem = origSetItem;
  };
}

declare global {
  interface Window {
    QandaWebView?: { postMessage: (message: string) => void };
    webkit?: {
      messageHandlers?: {
        qanda?: { postMessage?: (message: string) => void };
        Qanda?: { postMessage?: (message: string) => void };
      };
    };
  }
}
