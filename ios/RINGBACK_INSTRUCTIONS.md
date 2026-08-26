# Ringback Tone for iOS

## How to add ringback.mp3 to iOS:

1. Open your project in Xcode: `ios/totusClubApp.xcworkspace`
2. Right-click on the `totusClubApp` folder in the Project Navigator
3. Select "Add Files to totusClubApp..."
4. Select your `ringback.mp3` file
5. Make sure "Copy items if needed" is checked
6. Make sure "totusClubApp" target is selected
7. Click "Add"

The file will be added to the main bundle and accessible via `Sound.MAIN_BUNDLE`.

## Recommended specifications:
- Format: MP3
- Duration: 3-5 seconds (will loop automatically)
- Sample rate: 44100 Hz
- Bitrate: 128 kbps
- Channels: Mono or Stereo

## Alternative: Using a system sound

If you want to use a system sound instead, you can modify the code to use iOS system sounds, but a custom ringback.mp3 file is recommended for consistency across platforms.

