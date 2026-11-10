# GONGSTRNG thermal printer compatibility (staged)

This branch adds `printer-compat.js`, an **optional** Web Bluetooth LE / WebUSB adapter. It does not replace the current receipt HTML renderer or change sales, inventory, customer, or receipt data.

## Current scope

- **BLE thermal printers:** best-effort discovery of a writable GATT characteristic. Printer firmware/protocols differ; successful pairing does not guarantee ESC/POS compatibility.
- **USB thermal printers:** best-effort WebUSB bulk-OUT interface discovery. Requires a supported Chromium browser, HTTPS, device permission, and compatible USB firmware/interface.
- **Bluetooth Classic / SPP:** not available to an ordinary Android Chrome web page. Requires a native Android bridge/app or a separate print service.
- **Wi-Fi / LAN:** ordinary browser JavaScript cannot open a raw TCP socket to port 9100. Keep system print dialog or add a trusted native/local print bridge.
- **58mm / 80mm:** paper width is still controlled by the existing receipt print CSS; printer hardware must match the selected width.
- **RJ11 / cash drawer:** optional and deliberately not required.

## Safety notes

- The existing `window.print()` receipt path remains untouched.
- The adapter's `test()` sends only a short test ticket and does not send a cash-drawer kick command.
- It does not yet convert the existing styled HTML receipt into a raster/ESC/POS image. Do not route live sales receipts through raw BLE/USB until a printer-specific test verifies complete output, paper width, character encoding, and feed/cut behavior.
- No drawer command is sent, so printers without RJ11/cash drawers are unaffected.

## Integration is not yet enabled

The adapter is not loaded by `index.html` yet. After review, load it with:

```html
<script src="printer-compat.js"></script>
```

Then wire the connect/test controls into the printer settings UI. Keep the existing receipt print button as the fallback. Do not enable auto-print or drawer behavior as part of this adapter.

## Required device testing

Test on the actual Android phone and actual printers: BLE, USB (with OTG if required), Bluetooth Classic, and LAN. For each model, verify the complete receipt against the on-screen preview before enabling live sale printing.
