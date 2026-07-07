import type { PropsWithChildren } from 'react';

// Custom HTML shell for web builds (expo-router). Adds the PWA manifest,
// theme color, and iOS home-screen metadata to every page.
//
// `viewport-fit=cover` lets the page draw edge-to-edge (under the notch /
// home indicator) and, critically, is what makes `env(safe-area-inset-*)`
// resolve to real values instead of 0 — react-native-safe-area-context's web
// implementation reads those to compute insets. Without it, `useSafeAreaInsets()`
// always returns 0 on iOS Safari.
//
// The height reset below replaces expo-router's default ScrollViewStyleReset
// (`height:100%` on html/body/#root) with a `100dvh` version. `100%`/`100vh`
// on iOS Safari sizes against the layout viewport (toolbar retracted), which
// is taller than what's actually visible when the toolbar is showing — the
// app ends up laid out a bit taller than the visible area, so the last bit
// (e.g. the tab bar) sits behind the browser chrome and needs a scroll/pan to
// reach. `100dvh` tracks the real visible viewport as the toolbar shows/hides.
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        {/* maximum-scale=1 stops iOS/Android from auto-zooming the page when a
            text input is focused (their default behavior for any input whose
            rendered font-size is under 16px) — without it, every tap into the
            create-post modal or a chat box zoomed the whole page in. */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, shrink-to-fit=no, viewport-fit=cover"
        />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#00274C" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="TitanConnect" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <style
          id="expo-reset"
          dangerouslySetInnerHTML={{
            __html: `html,body,#root{height:100%}body{overflow:hidden}#root{display:flex}
@supports (height: 100dvh) { html,body,#root{height:100dvh} }`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
