"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const KEYBOARD_THRESHOLD_PX = 120;

export function TelegramBridge() {
  const pathname = usePathname();
  const router = useRouter();
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let active = true;
    const cleanups: VoidFunction[] = [];
    const root = document.documentElement;

    async function connect() {
      const sdk = await import("@tma.js/sdk");
      if (!active || !sdk.isTMA()) return;

      const cleanupSdk = sdk.init({ acceptCustomStyles: false });
      cleanups.push(cleanupSdk);
      if (!active) return;

      root.dataset.telegram = "true";

      if (sdk.themeParams.mount.isAvailable()) {
        sdk.themeParams.mount();
        cleanups.push(sdk.themeParams.unmount);
        const unbindTheme = sdk.themeParams.bindCssVars.ifAvailable();
        if (unbindTheme.ok) cleanups.push(unbindTheme.data);

        const syncScheme = () => { root.dataset.tgColorScheme = sdk.themeParams.isDark() ? "dark" : "light"; };
        syncScheme();
        cleanups.push(sdk.themeParams.isDark.sub(syncScheme));
      }

      if (sdk.miniApp.mount.isAvailable()) {
        sdk.miniApp.mount();
        cleanups.push(sdk.miniApp.unmount);
        sdk.miniApp.setBgColor.ifAvailable("bg_color");
        sdk.miniApp.setHeaderColor.ifAvailable("bg_color");
        sdk.miniApp.setBottomBarColor.ifAvailable("secondary_bg_color");
        sdk.miniApp.ready.ifAvailable();
      }

      if (sdk.backButton.mount.isAvailable()) {
        sdk.backButton.mount();
        cleanups.push(sdk.backButton.unmount);
      }

      const visualViewport = window.visualViewport;
      const syncBrowserKeyboard = () => {
        const visibleHeight = visualViewport?.height ?? window.innerHeight;
        root.toggleAttribute("data-keyboard-open", window.innerHeight - visibleHeight > KEYBOARD_THRESHOLD_PX);
      };
      visualViewport?.addEventListener("resize", syncBrowserKeyboard, { passive: true });
      cleanups.push(() => visualViewport?.removeEventListener("resize", syncBrowserKeyboard));

      if (sdk.viewport.mount.isAvailable()) {
        try {
          await sdk.viewport.mount();
          if (!active) return;
          const unbindViewport = sdk.viewport.bindCssVars.ifAvailable();
          if (unbindViewport.ok) cleanups.push(unbindViewport.data);
          sdk.viewport.expand.ifAvailable();

          const syncTelegramKeyboard = () => {
            const keyboardOpen = sdk.viewport.stableHeight() - sdk.viewport.height() > KEYBOARD_THRESHOLD_PX;
            root.toggleAttribute("data-keyboard-open", keyboardOpen);
          };
          syncTelegramKeyboard();
          cleanups.push(sdk.viewport.height.sub(syncTelegramKeyboard));
          cleanups.push(sdk.viewport.stableHeight.sub(syncTelegramKeyboard));
        } catch {
          syncBrowserKeyboard();
        }
      }

      if (active) setConnected(true);
    }

    void connect().catch(() => {
      // A normal browser is a supported environment and needs no Telegram bridge.
    });

    return () => {
      active = false;
      setConnected(false);
      for (const cleanup of cleanups.toReversed()) cleanup();
      delete root.dataset.telegram;
      delete root.dataset.tgColorScheme;
      root.removeAttribute("data-keyboard-open");
    };
  }, []);

  useEffect(() => {
    if (!connected) return;
    let removeListener: VoidFunction | undefined;
    let active = true;

    async function syncBackButton() {
      const { backButton } = await import("@tma.js/sdk");
      if (!active) return;
      if (pathname === "/") {
        backButton.hide.ifAvailable();
        return;
      }

      const goBack = () => {
        if (window.history.length > 1) router.back();
        else router.push("/");
      };
      const result = backButton.onClick.ifAvailable(goBack);
      if (result.ok) removeListener = result.data;
      backButton.show.ifAvailable();
    }

    void syncBackButton();
    return () => {
      active = false;
      removeListener?.();
    };
  }, [connected, pathname, router]);

  return null;
}
