package com.mathiks.cryptgrave;

import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import android.content.pm.ActivityInfo;
import android.os.SystemClock;
import org.junit.Test;
import org.junit.runner.RunWith;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import static org.junit.Assert.*;

@RunWith(AndroidJUnit4.class)
public class OfflineGameTest {
    private String js(ActivityScenario<MainActivity> scenario, String code) throws Exception {
        CountDownLatch done = new CountDownLatch(1);
        AtomicReference<String> result = new AtomicReference<>();
        scenario.onActivity(a -> a.gameView().evaluateJavascript(code, value -> {
            result.set(value); done.countDown();
        }));
        assertTrue("WebView callback", done.await(10, TimeUnit.SECONDS));
        return result.get();
    }
    private void ready(ActivityScenario<MainActivity> s) throws Exception {
        for(int i=0;i<60;i++){
            if("true".equals(js(s,"document.readyState==='complete' && !!document.querySelector('[data-class]')"))) return;
            SystemClock.sleep(250);
        }
        fail("Game menu failed to load");
    }
    @Test public void offlinePlayRecreateAndResume() throws Exception {
        String key = "rogue-android-game002-v1";
        try(ActivityScenario<MainActivity> s = ActivityScenario.launch(MainActivity.class)){
            ready(s);
            assertEquals("\"CRYPTGRAVE — Android\"",js(s,"document.title"));
            assertEquals("8",js(s,"document.querySelectorAll('[data-d]').length"));
            assertEquals("4",js(s,"document.querySelectorAll('.crypt-class-card .class-portrait').length"));
            assertEquals("true",js(s,"!!document.querySelector('.crypt-hero svg') && !!document.getElementById('startTransfer')"));
            assertEquals("true",js(s,"location.origin==='https://appassets.androidplatform.net'"));
            js(s,"document.querySelector('[data-class=warrior]').click(); true");
            assertEquals("1",js(s,"JSON.parse(localStorage.getItem('"+key+"')).S.floor"));
            String turn = js(s,"JSON.parse(localStorage.getItem('"+key+"')).S.turn");
            assertEquals("3",js(s,"document.querySelectorAll('#hudMeters [role=progressbar]').length"));
            assertEquals("3",js(s,"document.querySelectorAll('[data-skill] .skill-cost').length"));
            js(s,"document.getElementById('inventory').click(); true");
            assertEquals("true",js(s,"!!document.querySelector('.crypt-sheet') && !!document.querySelector('.equipment-sprite')"));
            assertEquals("5",js(s,"document.querySelectorAll('.gear-rack [data-off]').length"));
            assertEquals("6",js(s,"document.querySelectorAll('.sheet-attributes [data-attr]').length"));
            assertEquals(turn,js(s,"JSON.parse(localStorage.getItem('"+key+"')).S.turn"));
            js(s,"document.getElementById('close').click(); true");
            js(s,"document.getElementById('wait').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true})); true");
            String next = js(s,"JSON.parse(localStorage.getItem('"+key+"')).S.turn");
            assertEquals(Integer.parseInt(turn)+1,Integer.parseInt(next));
            s.onActivity(a -> a.setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE));
            SystemClock.sleep(1200);
            assertEquals(next,js(s,"JSON.parse(localStorage.getItem('"+key+"')).S.turn"));
            s.recreate();ready(s);
            assertEquals("true",js(s,"!!document.getElementById('resume')"));
            js(s,"document.getElementById('startTransfer').click(); document.getElementById('transferExport').click(); true");
            assertEquals("true",js(s,"JSON.parse(document.getElementById('transferData').value).format==='cryptgrave-transfer-v1'"));
            assertEquals(next,js(s,"JSON.parse(document.getElementById('transferData').value).run.S.turn"));
            js(s,"document.getElementById('transferBack').click(); true");
            js(s,"document.getElementById('resume').click(); true");
            assertEquals(next,js(s,"JSON.parse(localStorage.getItem('"+key+"')).S.turn"));
            assertEquals("true",js(s,"document.querySelector('canvas').getBoundingClientRect().width>0"));
        }
    }
}
