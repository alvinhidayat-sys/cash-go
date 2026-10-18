package id.cashgo.app

import android.Manifest
import android.annotation.SuppressLint
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothManager
import android.content.ContentValues
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.provider.MediaStore
import android.util.Base64
import android.webkit.JavascriptInterface
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import androidx.webkit.WebViewAssetLoader
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.util.UUID

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private var fileCallback: ValueCallback<Array<Uri>>? = null

    private val chooser = registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { res ->
        val data = res.data
        val uris: Array<Uri>? = when {
            res.resultCode != RESULT_OK || data == null -> null
            data.clipData != null -> Array(data.clipData!!.itemCount) { data.clipData!!.getItemAt(it).uri }
            data.data != null -> arrayOf(data.data!!)
            else -> null
        }
        fileCallback?.onReceiveValue(uris)
        fileCallback = null
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val loader = WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()

        webView = WebView(this).apply {
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true          // cadangan localStorage
            settings.allowFileAccess = false
            settings.allowContentAccess = true
            settings.textZoom = 100
            settings.setSupportZoom(false)
            settings.cacheMode = WebSettings.LOAD_NO_CACHE
            overScrollMode = WebView.OVER_SCROLL_NEVER
            addJavascriptInterface(Bridge(), "Android")
            webViewClient = object : WebViewClient() {
                override fun shouldInterceptRequest(v: WebView?, r: WebResourceRequest?): WebResourceResponse? =
                    r?.url?.let { loader.shouldInterceptRequest(it) }
                override fun shouldOverrideUrlLoading(v: WebView?, r: WebResourceRequest?): Boolean {
                    // link eksternal (WA / sosmed) dibuka di aplikasi lain
                    val u = r?.url ?: return false
                    if (u.host != "appassets.androidplatform.net") {
                        runCatching { startActivity(Intent(Intent.ACTION_VIEW, u)) }
                        return true
                    }
                    return false
                }
            }
            webChromeClient = object : WebChromeClient() {
                override fun onShowFileChooser(
                    w: WebView?, cb: ValueCallback<Array<Uri>>?, params: FileChooserParams?
                ): Boolean {
                    fileCallback?.onReceiveValue(null)
                    fileCallback = cb
                    return try {
                        chooser.launch(params!!.createIntent()); true
                    } catch (e: Exception) { fileCallback?.onReceiveValue(null); fileCallback = null; false }
                }
            }
        }
        setContentView(webView)
        webView.loadUrl("https://appassets.androidplatform.net/assets/www/index.html")

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                webView.evaluateJavascript("(window.onBack ? window.onBack() : false)") { r ->
                    if (r != "true") { isEnabled = false; onBackPressedDispatcher.onBackPressed() }
                }
            }
        })
    }

    private fun toast(m: String) = runOnUiThread { Toast.makeText(this, m, Toast.LENGTH_LONG).show() }
    private fun js(code: String) = runOnUiThread { webView.evaluateJavascript(code, null) }

    inner class Bridge {
        private val dbFile get() = File(filesDir, "cashgo_db.json")

        /** Database utama disimpan di penyimpanan internal aplikasi. */
        @JavascriptInterface fun loadDb(): String = runCatching { if (dbFile.exists()) dbFile.readText() else "" }.getOrDefault("")

        @JavascriptInterface fun saveDb(json: String): Boolean = runCatching {
            val tmp = File(filesDir, "cashgo_db.tmp"); tmp.writeText(json)
            if (!tmp.renameTo(dbFile)) { dbFile.writeText(json); tmp.delete() }
            true
        }.getOrDefault(false)

        /** Simpan file (xls / pdf) ke folder Download/CashGO. */
        @JavascriptInterface fun saveFile(name: String, b64: String, mime: String): String = runCatching {
            val bytes = Base64.decode(b64, Base64.DEFAULT)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                val cv = ContentValues().apply {
                    put(MediaStore.Downloads.DISPLAY_NAME, name)
                    put(MediaStore.Downloads.MIME_TYPE, mime)
                    put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/CashGO")
                }
                val uri = contentResolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, cv)!!
                contentResolver.openOutputStream(uri)!!.use { it.write(bytes) }
                "Download/CashGO/$name"
            } else {
                val dir = File(getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), "CashGO").apply { mkdirs() }
                File(dir, name).writeBytes(bytes); "${dir.absolutePath}/$name"
            }
        }.getOrElse { "ERROR: ${it.message}" }

        @JavascriptInterface fun shareFile(name: String, b64: String, mime: String) {
            runCatching {
                val uri = cacheFile(name, b64)
                val i = Intent(Intent.ACTION_SEND).apply {
                    type = mime; putExtra(Intent.EXTRA_STREAM, uri)
                    addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                }
                startActivity(Intent.createChooser(i, "Bagikan").addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
            }.onFailure { toast("Gagal membagikan: ${it.message}") }
        }

        /** Buka chat WA customer langsung, isi ringkasan order + lampiran nota PDF. */
        @JavascriptInterface fun shareWhatsApp(phone: String, text: String, pdfB64: String, fileName: String) {
            runCatching {
                val num = phone.filter { it.isDigit() }
                val pkg = listOf("com.whatsapp", "com.whatsapp.w4b").firstOrNull { installed(it) }
                if (pkg == null || pdfB64.isEmpty()) {
                    val link = "https://wa.me/$num?text=" + Uri.encode(text)
                    startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(link)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
                    if (pkg != null) toast("Nota PDF bisa dikirim lewat tombol Bagikan PDF")
                    return
                }
                val uri = cacheFile(fileName, pdfB64)
                val i = Intent(Intent.ACTION_SEND).apply {
                    type = "application/pdf"; setPackage(pkg)
                    putExtra(Intent.EXTRA_STREAM, uri); putExtra(Intent.EXTRA_TEXT, text)
                    putExtra("jid", "$num@s.whatsapp.net")
                    addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                startActivity(i)
            }.onFailure { toast("WhatsApp tidak bisa dibuka: ${it.message}") }
        }

        @JavascriptInterface fun openLink(url: String) {
            runCatching { startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)) }
        }

        @JavascriptInterface fun toast(msg: String) = this@MainActivity.toast(msg)

        /** Daftar printer Bluetooth yang sudah dipasangkan (paired). */
        @SuppressLint("MissingPermission")
        @JavascriptInterface fun listPrinters(): String {
            if (!btPermission()) { askBtPermission(); return "PERMISSION" }
            val ad = (getSystemService(BLUETOOTH_SERVICE) as BluetoothManager).adapter ?: return "[]"
            val arr = JSONArray()
            ad.bondedDevices?.forEach { arr.put(JSONObject().put("name", it.name ?: "Printer").put("mac", it.address)) }
            return arr.toString()
        }

        /** Kirim byte ESC/POS ke printer thermal Bluetooth (SPP). */
        @SuppressLint("MissingPermission")
        @JavascriptInterface fun printBytes(mac: String, b64: String) {
            if (!btPermission()) { askBtPermission(); js("window.onPrintResult(false,'Izin Bluetooth diperlukan, coba lagi')"); return }
            Thread {
                var ok = false; var msg = ""
                try {
                    val ad: BluetoothAdapter = (getSystemService(BLUETOOTH_SERVICE) as BluetoothManager).adapter
                    val dev = ad.getRemoteDevice(mac)
                    ad.cancelDiscovery()
                    val sock = dev.createRfcommSocketToServiceRecord(UUID.fromString("00001101-0000-1000-8000-00805F9B34FB"))
                    sock.connect()
                    sock.outputStream.apply { write(Base64.decode(b64, Base64.DEFAULT)); flush() }
                    Thread.sleep(600); sock.close(); ok = true; msg = "Nota terkirim ke printer"
                } catch (e: Exception) { msg = "Gagal mencetak: ${e.message}" }
                js("window.onPrintResult($ok,${JSONObject.quote(msg)})")
            }.start()
        }
    }

    private fun cacheFile(name: String, b64: String): Uri {
        val dir = File(cacheDir, "share").apply { mkdirs() }
        val f = File(dir, name); f.writeBytes(Base64.decode(b64, Base64.DEFAULT))
        return FileProvider.getUriForFile(this, "$packageName.fileprovider", f)
    }
    private fun installed(pkg: String) = runCatching { packageManager.getPackageInfo(pkg, 0); true }.getOrDefault(false)
    private fun btPermission() = Build.VERSION.SDK_INT < Build.VERSION_CODES.S ||
        ContextCompat.checkSelfPermission(this, Manifest.permission.BLUETOOTH_CONNECT) == PackageManager.PERMISSION_GRANTED
    private fun askBtPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S)
            ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.BLUETOOTH_CONNECT), 7)
    }
}
