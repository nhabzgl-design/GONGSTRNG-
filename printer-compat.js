/* GONGSTRNG printer compatibility adapter
 * Optional module; does not replace the existing receipt renderer.
 * Direct BLE/USB support is best-effort and depends on printer firmware.
 */
(function () {
  'use strict';
  if (window.GONGSTRNGPrinter) return;

  const state = { transport: null, device: null, characteristic: null, usb: null, endpoint: null, iface: null };
  const ESC = 0x1b, GS = 0x1d;
  const enc = new TextEncoder();

  function capabilities() {
    return {
      webBluetooth: !!(navigator.bluetooth && window.isSecureContext),
      webUSB: !!(navigator.usb && window.isSecureContext),
      systemPrint: typeof window.print === 'function',
      bluetoothClassic: false,
      rawNetwork: false
    };
  }

  async function connectBluetooth() {
    if (!capabilities().webBluetooth) throw new Error('Hindi available ang Web Bluetooth sa browser/device na ito.');
    const device = await navigator.bluetooth.requestDevice({ acceptAllDevices: true });
    const server = await device.gatt.connect();
    const services = await server.getPrimaryServices();
    let writable = null;
    for (const service of services) {
      const chars = await service.getCharacteristics();
      writable = chars.find(c => c.properties.writeWithoutResponse || c.properties.write);
      if (writable) break;
    }
    if (!writable) {
      try { device.gatt.disconnect(); } catch (_) {}
      throw new Error('Nakakonekta ang device pero walang natukoy na writable printer characteristic. Maaaring proprietary ang BLE protocol nito.');
    }
    state.transport = 'ble'; state.device = device; state.characteristic = writable;
    device.addEventListener('gattserverdisconnected', () => {
      if (state.device === device) { state.transport = null; state.characteristic = null; }
    });
    return { name: device.name || 'Bluetooth printer', transport: 'BLE' };
  }

  async function connectUSB() {
    if (!capabilities().webUSB) throw new Error('Hindi available ang WebUSB sa browser/device na ito.');
    const device = await navigator.usb.requestDevice({ filters: [] });
    await device.open();
    if (!device.configuration) await device.selectConfiguration(1);
    let selected = null;
    for (const iface of device.configuration.interfaces) {
      for (const alt of iface.alternates) {
        const out = alt.endpoints.find(ep => ep.direction === 'out' && ep.type === 'bulk');
        if (out) { selected = { iface: iface.interfaceNumber, alternate: alt.alternateSetting, endpoint: out.endpointNumber }; break; }
      }
      if (selected) break;
    }
    if (!selected) { await device.close(); throw new Error('Walang nakitang USB bulk OUT endpoint para sa raw printing.'); }
    await device.claimInterface(selected.iface);
    if (selected.alternate) await device.selectAlternateInterface(selected.iface, selected.alternate);
    state.transport = 'usb'; state.usb = device; state.endpoint = selected.endpoint; state.iface = selected.iface;
    return { name: device.productName || 'USB printer', transport: 'USB' };
  }

  async function write(bytes) {
    if (state.transport === 'ble' && state.characteristic) {
      const c = state.characteristic;
      const chunkSize = c.properties.writeWithoutResponse ? 180 : 180;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        const part = bytes.slice(i, i + chunkSize);
        if (c.writeValueWithoutResponse && c.properties.writeWithoutResponse) await c.writeValueWithoutResponse(part);
        else await c.writeValue(part);
      }
      return;
    }
    if (state.transport === 'usb' && state.usb) {
      for (let i = 0; i < bytes.length; i +=  USB_CHUNK) {
        const part = bytes.slice(i, i + USB_CHUNK);
        const result = await state.usb.transferOut(state.endpoint, part);
        if (result.status !== 'ok') throw new Error('USB transfer failed: ' + result.status);
      }
      return;
    }
    throw new Error('Walang direktang printer connection. Gamitin ang existing Android/browser print dialog.');
  }

  const USB_CHUNK = 4096;
  function testBytes() {
    return concat([
      Uint8Array.from([ESC, 0x40, ESC, 0x61, 1]),
      enc.encode('GONGSTRNG MOTORSHOP\nPRINTER TEST\n'),
      Uint8Array.from([ESC, 0x61, 0, GS, 0x21, 0]),
      enc.encode('58mm / 80mm READY\nConnection test only\n\n'),
      Uint8Array.from([0x0a, 0x0a, 0x0a])
    ]);
  }
  function concat(parts) {
    const total = parts.reduce((n, p) => n + p.length, 0);
    const out = new Uint8Array(total); let offset = 0;
    parts.forEach(p => { out.set(p, offset); offset += p.length; });
    return out;
  }

  window.GONGSTRNGPrinter = {
    capabilities,
    connectBluetooth,
    connectUSB,
    test: () => write(testBytes()),
    disconnect: async () => {
      if (state.device && state.device.gatt.connected) state.device.gatt.disconnect();
      if (state.usb) { try { await state.usb.releaseInterface(state.iface); } catch (_) {} try { await state.usb.close(); } catch (_) {} }
      Object.assign(state, { transport: null, device: null, characteristic: null, usb: null, endpoint: null, iface: null });
    },
    status: () => ({ transport: state.transport, device: state.device?.name || state.usb?.productName || null })
  };
})();