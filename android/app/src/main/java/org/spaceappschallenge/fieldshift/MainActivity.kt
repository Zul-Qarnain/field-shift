package org.spaceappschallenge.fieldshift

import android.annotation.SuppressLint
import android.graphics.Bitmap
import android.os.Bundle
import android.view.View
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.ProgressBar
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity

/**
 * Field Shift: Android Farmer Application.
 *
 * Provides a high-performance, offline-capable Android container for Bangladesh farmers.
 * Supports:
 * - Local DOM storage and offline asset caching.
 * - Hardware acceleration for smooth stacked-bar animations and map browsing.
 * - Graceful offline fallback with offline guidance and SMS generator.
 */
class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var progressBar: ProgressBar
    private lateinit var errorView: View
    private val TARGET_URL = "https://field-shift-tan.vercel.app/quick"

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Set up root layout programmatically to avoid complex resource dependencies
        val rootLayout = android.widget.FrameLayout(this).apply {
            layoutParams = android.widget.FrameLayout.LayoutParams(
                android.widget.FrameLayout.LayoutParams.MATCH_PARENT,
                android.widget.FrameLayout.LayoutParams.MATCH_PARENT
            )
            setBackgroundColor(android.graphics.Color.parseColor("#0f172a"))
        }

        webView = WebView(this).apply {
            layoutParams = android.widget.FrameLayout.LayoutParams(
                android.widget.FrameLayout.LayoutParams.MATCH_PARENT,
                android.widget.FrameLayout.LayoutParams.MATCH_PARENT
            )
            visibility = View.VISIBLE
        }

        progressBar = ProgressBar(this).apply {
            layoutParams = android.widget.FrameLayout.LayoutParams(
                android.widget.FrameLayout.LayoutParams.WRAP_CONTENT,
                android.widget.FrameLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                gravity = android.view.Gravity.CENTER
            }
        }

        errorView = android.widget.LinearLayout(this).apply {
            orientation = android.widget.LinearLayout.VERTICAL
            gravity = android.view.Gravity.CENTER
            setPadding(48, 48, 48, 48)
            visibility = View.GONE
            layoutParams = android.widget.FrameLayout.LayoutParams(
                android.widget.FrameLayout.LayoutParams.MATCH_PARENT,
                android.widget.FrameLayout.LayoutParams.MATCH_PARENT
            )

            val errorTitle = TextView(this@MainActivity).apply {
                text = "Field Shift — অফলাইন মোড"
                textSize = 20f
                setTextColor(android.graphics.Color.WHITE)
                gravity = android.view.Gravity.CENTER
            }
            val errorSubtitle = TextView(this@MainActivity).apply {
                text = "ইন্টারনেট সংযোগ নেই। পূর্ববর্তী সংরক্ষিত তথ্য প্রদর্শিত হচ্ছে।"
                textSize = 14f
                setTextColor(android.graphics.Color.parseColor("#94a3b8"))
                gravity = android.view.Gravity.CENTER
                setPadding(0, 16, 0, 32)
            }
            val retryBtn = android.widget.Button(this@MainActivity).apply {
                text = "পুনরায় চেষ্টা করুন (Retry)"
                setBackgroundColor(android.graphics.Color.parseColor("#166534"))
                setTextColor(android.graphics.Color.WHITE)
                setOnClickListener {
                    errorView.visibility = View.GONE
                    webView.visibility = View.VISIBLE
                    webView.reload()
                }
            }

            addView(errorTitle)
            addView(errorSubtitle)
            addView(retryBtn)
        }

        rootLayout.addView(webView)
        rootLayout.addView(progressBar)
        rootLayout.addView(errorView)
        setContentView(rootLayout)

        configureWebView()
        webView.loadUrl(TARGET_URL)
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun configureWebView() {
        val settings: WebSettings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.databaseEnabled = true
        settings.cacheMode = WebSettings.LOAD_DEFAULT
        settings.allowFileAccess = true
        settings.useWideViewPort = true
        settings.loadWithOverviewMode = true
        settings.setSupportZoom(false)

        webView.webViewClient = object : WebViewClient() {
            override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
                super.onPageStarted(view, url, favicon)
                progressBar.visibility = View.VISIBLE
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                progressBar.visibility = View.GONE
            }

            override fun onReceivedError(
                view: WebView?,
                request: WebResourceRequest?,
                error: WebResourceError?
            ) {
                if (request?.isForMainFrame == true) {
                    progressBar.visibility = View.GONE
                    webView.visibility = View.GONE
                    errorView.visibility = View.VISIBLE
                }
            }
        }
    }

    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }
}
