/*! Eretek Online Araçlar #86 — Modbus Veri Dizilimi Okuyucu */
ERT.def('86', {
	run: function (v, c) {
		var W = { f32: 2, i32: 2, u32: 2, f64: 4, i16: 1, u16: 1 }[v.type], rows = [], vv = {}, msgs = [];
		var ord = W === 1 ? ['AB', 'BA'] : (W === 2 ? ['ABCD', 'CDAB', 'BADC', 'DCBA'] : ['ABCDEFGH', 'GHEFCDAB', 'BADCFEHG', 'HGFEDCBA']);
		var fmtV = function (x) { if (v.type.charAt(0) !== 'f') { return c.n(x, 0); } if (!isFinite(x)) { return String(x); } if (x !== 0 && (Math.abs(x) < 1e-4 || Math.abs(x) >= 1e12)) { var e = x.toExponential(4); return c.lang === 'en' ? e : e.replace('.', ','); } return c.n(x, 7); };
		var perm = function (bytes, o) { var base = ord[0]; return o.split('').map(function (ch) { return bytes[base.indexOf(ch)]; }); };
		var readV = function (b) { var dv = new DataView(new Uint8Array(b).buffer); return { f32: function () { return dv.getFloat32(0); }, i32: function () { return dv.getInt32(0); }, u32: function () { return dv.getUint32(0); }, f64: function () { return dv.getFloat64(0); }, i16: function () { return dv.getInt16(0); }, u16: function () { return dv.getUint16(0); } }[v.type](); };
		var toRegs = function (b) { var r = []; for (var i = 0; i < b.length; i += 2) { r.push(b[i] << 8 | b[i + 1]); } return r; };
		var hx = function (r) { return r.map(function (x) { return '0x' + ('000' + x.toString(16).toUpperCase()).slice(-4); }).join(' '); };
		if (v.mode === 'dec') {
			var toks = String(v.regs || '').trim().split(/[\s,;]+/).filter(Boolean);
			if (toks.length !== W) { throw c.fe('regs', 'count', { n: W }); }
			var regs = toks.map(function (t) { var x = /^0x[0-9a-f]{1,4}$/i.test(t) ? parseInt(t, 16) : (/^-?\d+$/.test(t) ? +t : NaN); if (x < 0 && x >= -32768) { x += 65536; } if (!(x >= 0 && x <= 65535)) { throw c.fe('regs', 'reg', { t: t }); } return x; });
			var bytes = []; regs.forEach(function (r) { bytes.push(r >> 8, r & 255); });
			ord.forEach(function (o) { var val = readV(perm(bytes, o)); vv[o] = v.type.charAt(0) === 'f' ? (isFinite(val) ? Math.round(val * 1e6) / 1e6 : String(val)) : val; rows.push([o, c.t('o_' + o.length + '_' + ord.indexOf(o)), fmtV(val)]); });
			if (v.exp !== null && v.exp !== undefined) {
				var hit = ord.filter(function (o) { var x = typeof vv[o] === 'number' ? vv[o] : NaN; return Math.abs(x - v.exp) <= Math.max(1e-6, Math.abs(v.exp) * 1e-5); });
				vv.match = hit; msgs.push(hit.length ? ['ok', c.t('match', { o: hit.join(', ') })] : ['warn', c.t('noMatch')]);
			}
			msgs.push(['info', c.t('regsIn', { r: hx(regs) })]);
			return { big: c.t('bigDec', { o: ord[0], v: fmtV(readV(bytes)) }), msgs: msgs.concat([['info', c.t('orders')]]), tables: [{ cols: [c.t('c_o'), c.t('c_n'), c.t('c_v')], rows: rows }], x: { copy: rows.map(function (r) { return r[0] + ': ' + r[2]; }).join('\n') }, v: vv };
		}
		if (v.val === null || v.val === undefined) { throw c.fe('val', 'req'); }
		var lim = { i16: [-32768, 32767], u16: [0, 65535], i32: [-2147483648, 2147483647], u32: [0, 4294967295] }[v.type];
		if (lim && (v.val < lim[0] || v.val > lim[1] || Math.floor(v.val) !== v.val)) { throw c.fe('val', 'outT', { a: lim[0], b: lim[1] }); }
		var buf = new DataView(new ArrayBuffer(W * 2));
		({ f32: function () { buf.setFloat32(0, v.val); }, i32: function () { buf.setInt32(0, v.val); }, u32: function () { buf.setUint32(0, v.val); }, f64: function () { buf.setFloat64(0, v.val); }, i16: function () { buf.setInt16(0, v.val); }, u16: function () { buf.setUint16(0, v.val); } })[v.type]();
		var be = Array.from(new Uint8Array(buf.buffer));
		ord.forEach(function (o) { var r = toRegs(perm(be, o)); vv[o] = r; rows.push([o, c.t('o_' + o.length + '_' + ord.indexOf(o)), hx(r), r.join(' ')]); });
		if (v.type === 'f32' && Math.abs(readV(be) - v.val) > Math.abs(v.val) * 1e-7) { msgs.push(['info', c.t('f32round', { x: c.n(readV(be), 7) })]); }
		msgs.push(['info', c.t('orders')]);
		return { big: c.t('bigEnc', { r: hx(vv[ord[0]]) }), msgs: msgs, tables: [{ cols: [c.t('c_o'), c.t('c_n'), 'Hex', c.t('c_d')], rows: rows }], x: { copy: rows.map(function (r) { return r[0] + ': ' + r[2]; }).join('\n') }, v: vv };
	}
});
