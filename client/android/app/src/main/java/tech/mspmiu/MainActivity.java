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
        
        // Show system UI (notch and status bar) on all devices
        showSystemUI();
        
        // Setup SwipeRefreshLayout after a short delay to ensure Capacitor is initialized
        setupSwipeRefresh();
    }

    @Override
    public void onStart() {
        super.onStart();
        // Ensure setup happens even if onCreate didn't catch it
        setupSwipeRefresh();
        showSystemUI();
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
                    
                    // Ensure SwipeRefreshLayout is enabled
                    swipeRefreshLayout.setEnabled(true);
                    
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
            showSystemUI();
        }
    }

    private void showSystemUI() {
        // Enable edge-to-edge display but show system bars
        WindowCompat.setDecorFitsSystemWindows(getWindow(), true);
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            // For Android 11 (API 30) and above
            WindowInsetsController controller = getWindow().getInsetsController();
            if (controller != null) {
                // Show status bars and navigation bars
                controller.show(android.view.WindowInsets.Type.statusBars() | 
                               android.view.WindowInsets.Type.navigationBars());
                // Use default behavior (bars stay visible)
                controller.setSystemBarsBehavior(
                    WindowInsetsController.BEHAVIOR_DEFAULT
                );
            }
        } else {
            // For older Android versions
            View decorView = getWindow().getDecorView();
            // Show system UI with stable layout
            int uiOptions = View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                    | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                    | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION;
            decorView.setSystemUiVisibility(uiOptions);
        }
        
        // Clear fullscreen flag to show status bar
        getWindow().clearFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN);
    }
}
