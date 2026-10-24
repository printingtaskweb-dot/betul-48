# Betul Nagar Android app release

The Android app is a Trusted Web Activity. It opens the Betul Nagar PWA full-screen in the user's installed Chrome browser and uses the same Chromium engine as the website. Keep the signing key stable so users can install future versions over earlier releases.

## Configure release signing

Generate a release key once on a trusted computer. Keep the keystore backed up securely and never commit it:

```powershell
keytool -genkeypair -v -keystore betulnagar-release.keystore -alias betulnagar -keyalg RSA -keysize 2048 -validity 10000
$keystoreBase64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes((Resolve-Path .\betulnagar-release.keystore)))
$keystoreBase64 | gh secret set ANDROID_KEYSTORE_BASE64
gh secret set ANDROID_KEYSTORE_PASSWORD
gh secret set ANDROID_KEY_PASSWORD
```

Add these repository secrets under **Settings → Secrets and variables → Actions** if GitHub CLI is not installed. `ANDROID_KEYSTORE_PASSWORD` and `ANDROID_KEY_PASSWORD` are entered as secret values. For the generated key, both passwords may be the same.

## Build a release

After the signing secrets are configured, open **Actions → Release Betul Nagar Android app → Run workflow**. Enter an app version name such as `1.0.0` and a positive, never-reused version code such as `1`. Each later app release must use a higher version code. The workflow runs only when manually triggered and publishes a GitHub Release containing the signed APK, an AAB, and the Digital Asset Links file.

The repository's GitHub Releases page is the public download location when the repository is public. Users can download the APK there and install it on Android.

## Enable full-screen verification

After the first release, download `assetlinks.json` from that release and add it to `public/.well-known/assetlinks.json`, then push the website change so Vercel serves it at `https://www.betulnagar.co.in/.well-known/assetlinks.json`. The file contains the SHA-256 certificate fingerprint for the signing key. Keep using the same key for every update. Until the website association is live, Chrome opens the app in a browser tab with browser controls instead of the verified full-screen TWA.
