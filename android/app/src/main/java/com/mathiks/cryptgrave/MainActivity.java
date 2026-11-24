package com.mathiks.cryptgrave;

import android.app.Activity;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.net.Uri;
import android.view.View;
import android.view.WindowInsets;
import android.webkit.*;
import android.widget.FrameLayout;
import androidx.webkit.WebViewAssetLoader;
import java.io.ByteArrayInputStream;
import java.util.Collections;

public final class MainActivity extends Activity {
    static final String HOST = "appassets.androidplatform.net";
    static final String GAME_URL = "https://" + HOST + "/assets/index.html";
    private WebView game;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setStatusBarColor(Color.rgb(17,21,28));
        getWindow().setNavigationBarColor(Color.rgb(17,21,28));
        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.rgb(17,21,28));
        if (Build.VERSION.SDK_INT >= 35) {
            root.setOnApplyWindowInsetsListener((v, insets) -> {
                android.graphics.Insets safe = insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout());
                v.setPadding(safe.left, safe.top, safe.right, safe.bottom);
                return WindowInsets.CONSUMED;
            });
        }
        game = new WebView(this);
        game.setId(View.generateViewId());
        root.addView(game, new FrameLayout.LayoutParams(-1,-1));
        setContentView(root);
        root.requestApplyInsets();
        WebSettings settings = game.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setSupportMultipleWindows(false);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setBuiltInZoomControls(false);
        game.setBackgroundColor(Color.rgb(17,21,28));
        game.setWebChromeClient(new WebChromeClient()); // local confirmation dialogs
        final WebViewAssetLoader loader = new WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
            .build();
        game.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return !GAME_URL.equals(request.getUrl().toString());
            }
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri url = request.getUrl();
                if ("GET".equals(request.getMethod()) && "https".equals(url.getScheme())
                    && HOST.equals(url.getHost()) && ("/assets/index.html".equals(url.getPath()) || "/assets/icon.svg".equals(url.getPath()))) {
                    WebResourceResponse response = loader.shouldInterceptRequest(url);
                    if (response != null) return response;
                }
                return new WebResourceResponse("text/plain", "UTF-8", 403, "Forbidden",
                    Collections.emptyMap(), new ByteArrayInputStream(new byte[0]));
            }
        });
        game.loadUrl(GAME_URL);
    }
    WebView gameView() { return game; }
    @Override protected void onPause() { if(game!=null)game.onPause(); super.onPause(); }
    @Override protected void onResume() { super.onResume(); if(game!=null)game.onResume(); }
    @Override protected void onDestroy() {
        if(game!=null){
            if(game.getParent() instanceof android.view.ViewGroup) ((android.view.ViewGroup)game.getParent()).removeView(game);
            game.destroy();game=null;
        }
        super.onDestroy();
    }
}
