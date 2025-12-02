package tech.mspmiu;

import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Show system UI (notch and status bar) on all devices
        showSystemUI();
    }

    @Override
    public void onStart() {
        super.onStart();
        showSystemUI();
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
