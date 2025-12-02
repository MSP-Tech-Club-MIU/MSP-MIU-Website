package tech.mspmiu;

import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.webkit.WebView;
import androidx.core.view.WindowCompat;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private SwipeRefreshLayout swipeRefreshLayout;
    private WebView webView;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Hide notch and status bar for consistent interface
        hideSystemUI();
        
        // Setup SwipeRefreshLayout after a short delay to ensure Capacitor is initialized
        setupSwipeRefresh();
    }

    @Override
    public void onStart() {
        super.onStart();
        // Ensure setup happens even if onCreate didn't catch it
        setupSwipeRefresh();
        hideSystemUI();
    }

    private void setupSwipeRefresh() {
        // Find the SwipeRefreshLayout from the layout
        swipeRefreshLayout = findViewById(R.id.swipe_refresh_layout);
        
        if (swipeRefreshLayout == null) {
            // If layout not found, try again after a delay
            new Handler(Looper.getMainLooper()).postDelayed(this::setupSwipeRefresh, 100);
            return;
        }
        
        // Get the bridge's web view after Capacitor initializes it
        // Use a handler to ensure the bridge is fully initialized
        new Handler(Looper.getMainLooper()).post(() -> {
            try {
                webView = getBridge().getWebView();
                
                if (webView != null && swipeRefreshLayout != null) {
                    // Move the WebView into the SwipeRefreshLayout if it's not already there
                    ViewGroup parent = (ViewGroup) webView.getParent();
                    if (parent != null && parent != swipeRefreshLayout) {
                        // Save layout params
                        ViewGroup.LayoutParams params = webView.getLayoutParams();
                        parent.removeView(webView);
                        swipeRefreshLayout.addView(webView, params);
                    }
                    
                    // Configure SwipeRefreshLayout with modern colors
                    swipeRefreshLayout.setColorSchemeResources(
                        android.R.color.holo_blue_bright,
                        android.R.color.holo_green_light,
                        android.R.color.holo_orange_light,
                        android.R.color.holo_red_light
                    );
                    
                    // Set progress background color
                    swipeRefreshLayout.setProgressBackgroundColorSchemeResource(android.R.color.white);
                    
                    // Set the refresh listener
                    swipeRefreshLayout.setOnRefreshListener(() -> {
                        // Reload the web view
                        if (webView != null) {
                            webView.reload();
                        }
                        // Stop refreshing after reload completes
                        new Handler(Looper.getMainLooper()).postDelayed(() -> {
                            if (swipeRefreshLayout != null) {
                                swipeRefreshLayout.setRefreshing(false);
                            }
                        }, 1500);
                    });
                }
            } catch (Exception e) {
                // If bridge not ready, try again later
                new Handler(Looper.getMainLooper()).postDelayed(this::setupSwipeRefresh, 200);
            }
        });
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            hideSystemUI();
        }
    }

    private void hideSystemUI() {
        // Enable edge-to-edge display
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            // For Android 11 (API 30) and above
            WindowInsetsController controller = getWindow().getInsetsController();
            if (controller != null) {
                controller.hide(android.view.WindowInsets.Type.statusBars() | 
                               android.view.WindowInsets.Type.navigationBars());
                controller.setSystemBarsBehavior(
                    WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
                );
            }
        } else {
            // For older Android versions
            View decorView = getWindow().getDecorView();
            int uiOptions = View.SYSTEM_UI_FLAG_FULLSCREEN
                    | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                    | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                    | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                    | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                    | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION;
            decorView.setSystemUiVisibility(uiOptions);
        }
        
        // Hide the status bar
        getWindow().setFlags(
            WindowManager.LayoutParams.FLAG_FULLSCREEN,
            WindowManager.LayoutParams.FLAG_FULLSCREEN
        );
    }
}
