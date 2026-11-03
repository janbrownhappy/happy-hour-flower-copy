import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import forge from 'npm:node-forge@1.3.1';
import { canActForVenue } from '../../shared/venueAccess.ts';

const PASS_TYPE_IDENTIFIER = 'pass.happyhourflower.happyhourflwr';
const TEAM_IDENTIFIER = Deno.env.get('APPLE_TEAM_IDENTIFIER') || 'M29549CBNY';

function strToBytes(str) {
  return new TextEncoder().encode(str);
}

function crc32(data) {
  const table = makeCrc32Table();
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ data[i]) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeCrc32Table() {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c;
  }
  return table;
}

function intToBytes(value, numBytes) {
  const bytes = [];
  for (let i = 0; i < numBytes; i++) {
    bytes.push(value & 0xff);
    value >>= 8;
  }
  return bytes;
}

function buildZip(files) {
  const localHeaders = [];
  const centralHeaders = [];
  let offset = 0;

  for (const [name, data] of Object.entries(files)) {
    const nameBytes = strToBytes(name);
    const fileData = typeof data === 'string' ? strToBytes(data) : data;
    const crc = crc32(fileData);

    const localHeader = new Uint8Array([
      0x50, 0x4B, 0x03, 0x04,
      0x14, 0x00,
      0x00, 0x00,
      0x00, 0x00,
      0x00, 0x00,
      0x00, 0x00,
      ...intToBytes(crc, 4),
      ...intToBytes(fileData.length, 4),
      ...intToBytes(fileData.length, 4),
      ...intToBytes(nameBytes.length, 2),
      0x00, 0x00,
      ...nameBytes,
      ...fileData,
    ]);

    localHeaders.push(localHeader);

    const centralHeader = new Uint8Array([
      0x50, 0x4B, 0x01, 0x02,
      0x14, 0x00,
      0x14, 0x00,
      0x00, 0x00,
      0x00, 0x00,
      0x00, 0x00,
      0x00, 0x00,
      ...intToBytes(crc, 4),
      ...intToBytes(fileData.length, 4),
      ...intToBytes(fileData.length, 4),
      ...intToBytes(nameBytes.length, 2),
      0x00, 0x00,
      0x00, 0x00,
      0x00, 0x00,
      0x00, 0x00,
      0x00, 0x00, 0x00, 0x00,
      ...intToBytes(offset, 4),
      ...nameBytes,
    ]);

    centralHeaders.push(centralHeader);
    offset += localHeader.length;
  }

  const centralDirOffset = offset;
  const centralDirSize = centralHeaders.reduce((s, h) => s + h.length, 0);
  const numFiles = Object.keys(files).length;

  const endRecord = new Uint8Array([
    0x50, 0x4B, 0x05, 0x06,
    0x00, 0x00,
    0x00, 0x00,
    ...intToBytes(numFiles, 2),
    ...intToBytes(numFiles, 2),
    ...intToBytes(centralDirSize, 4),
    ...intToBytes(centralDirOffset, 4),
    0x00, 0x00,
  ]);

  const totalSize = offset + centralDirSize + endRecord.length;
  const result = new Uint8Array(totalSize);
  let pos = 0;
  for (const h of localHeaders) { result.set(h, pos); pos += h.length; }
  for (const h of centralHeaders) { result.set(h, pos); pos += h.length; }
  result.set(endRecord, pos);
  return result;
}

async function sha1Hex(data) {
  const bytes = typeof data === 'string' ? strToBytes(data) : data;
  const hashBuffer = await crypto.subtle.digest('SHA-1', bytes);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function signManifest(manifestStr, p12Base64, p12Password) {
  // Decode p12
  const p12Der = forge.util.decode64(p12Base64);
  const p12Asn1 = forge.asn1.fromDer(p12Der);
  const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, p12Password);

  // Extract cert and private key
  const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
  const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });

  const certBag = certBags[forge.pki.oids.certBag]?.[0];
  const keyBag = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0];

  if (!certBag || !keyBag) {
    throw new Error('Could not extract certificate or key from P12');
  }

  const certificate = certBag.cert;
  const privateKey = keyBag.key;

  // Create CMS signed data
  const p7 = forge.pkcs7.createSignedData();
  p7.content = forge.util.createBuffer(manifestStr, 'utf8');
  p7.addCertificate(certificate);
  p7.addSigner({
    key: privateKey,
    certificate: certificate,
    digestAlgorithm: forge.pki.oids.sha256,
    authenticatedAttributes: [
      { type: forge.pki.oids.contentType, value: forge.pki.oids.data },
      { type: forge.pki.oids.messageDigest },
      { type: forge.pki.oids.signingTime, value: new Date() },
    ],
  });

  p7.sign({ detached: true });

  const der = forge.asn1.toDer(p7.toAsn1()).getBytes();
  // Convert binary string to Uint8Array
  const bytes = new Uint8Array(der.length);
  for (let i = 0; i < der.length; i++) {
    bytes[i] = der.charCodeAt(i);
  }
  return bytes;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { passInstanceId } = body;

    if (!passInstanceId) {
      return Response.json({ error: 'passInstanceId required' }, { status: 400 });
    }

    const passInstance = await base44.asServiceRole.entities.PassInstance.get(passInstanceId).catch((e) => (e.status === 404 ? null : Promise.reject(e)));
    if (!passInstance) {
      return Response.json({ error: 'Pass instance not found' }, { status: 404 });
    }
    const allowed = passInstance.consumer_user_id === user.id || passInstance.created_by_id === user.id ||
      (await canActForVenue(base44.asServiceRole, user, passInstance.venue_id));
    if (!allowed) {
      return Response.json({ error: 'Pass instance not found' }, { status: 404 });
    }

    const walletPass = await base44.asServiceRole.entities.WalletPass.get(passInstance.wallet_pass_id);
    if (!walletPass) {
      return Response.json({ error: 'Wallet pass template not found' }, { status: 404 });
    }

    const isLoyalty = walletPass.pass_type === 'loyalty_card';
    const serialNumber = passInstance.serial_number;

    const passJson = {
      formatVersion: 1,
      passTypeIdentifier: PASS_TYPE_IDENTIFIER,
      serialNumber: serialNumber,
      teamIdentifier: TEAM_IDENTIFIER,
      organizationName: 'Happy Hour Flower',
      description: walletPass.title,
      backgroundColor: walletPass.background_color || 'rgb(26, 26, 46)',
      labelColor: walletPass.label_color || 'rgb(255, 255, 255)',
      foregroundColor: walletPass.foreground_color || 'rgb(245, 166, 35)',
      logoText: 'Happy Hour Flower',
      barcodes: [{
        message: passInstance.redemption_code,
        format: 'PKBarcodeFormatQR',
        messageEncoding: 'iso-8859-1',
        altText: passInstance.redemption_code,
      }],
      ...(passInstance.expires_at ? { expirationDate: passInstance.expires_at } : {}),
    };

    if (isLoyalty) {
      passJson.storeCard = {
        headerFields: [{
          key: 'points',
          label: walletPass.loyalty_points_label || 'Points',
          value: `${passInstance.loyalty_points || 0}/${walletPass.loyalty_max_points || 10}`,
        }],
        primaryFields: [{
          key: 'program',
          label: 'Program',
          value: walletPass.loyalty_program_name || walletPass.title,
        }],
        secondaryFields: [{
          key: 'venue',
          label: 'Venue',
          value: walletPass.venue_name || '',
        }],
        auxiliaryFields: walletPass.loyalty_reward_description ? [{
          key: 'reward',
          label: 'Reward',
          value: walletPass.loyalty_reward_description,
        }] : [],
        backFields: walletPass.terms ? [{
          key: 'terms',
          label: 'Terms & Conditions',
          value: walletPass.terms,
        }] : [],
      };
    } else {
      passJson.coupon = {
        headerFields: [{
          key: 'discount',
          label: 'Offer',
          value: walletPass.discount_value || '',
        }],
        primaryFields: [{
          key: 'offer',
          label: 'Happy Hour Special',
          value: walletPass.title,
        }],
        secondaryFields: [{
          key: 'venue',
          label: 'Venue',
          value: walletPass.venue_name || '',
        }],
        auxiliaryFields: passInstance.expires_at ? [{
          key: 'expires',
          label: 'Expires',
          value: passInstance.expires_at,
          dateStyle: 'PKDateStyleShort',
          timeStyle: 'PKDateStyleNone',
        }] : [],
        backFields: walletPass.terms ? [{
          key: 'terms',
          label: 'Terms & Conditions',
          value: walletPass.terms,
        }] : [],
      };
    }

    const passJsonStr = JSON.stringify(passJson, null, 2);

    // Build manifest with SHA1 hashes
    const manifest = {
      'pass.json': await sha1Hex(passJsonStr),
    };
    const manifestStr = JSON.stringify(manifest);

    // Sign the manifest using the P12 certificate
    const certBase64 = Deno.env.get('APPLE_PASS_CERTIFICATE_BASE64');
    const certPassword = Deno.env.get('APPLE_PASS_CERTIFICATE_PASSWORD');

    if (!certBase64 || !certPassword) {
      return Response.json({ error: 'Apple certificate secrets not configured' }, { status: 500 });
    }

    const signature = signManifest(manifestStr, certBase64, certPassword);

    // Build the .pkpass zip
    const zipBytes = buildZip({
      'pass.json': strToBytes(passJsonStr),
      'manifest.json': strToBytes(manifestStr),
      'signature': signature,
    });

    // Upload to Base44 storage
    const blob = new Blob([zipBytes], { type: 'application/vnd.apple.pkpass' });
    const uploadRes = await base44.asServiceRole.integrations.Core.UploadFile({ file: blob });
    const passUrl = uploadRes.file_url;

    // Update the pass instance with the download URL
    await base44.asServiceRole.entities.PassInstance.update(passInstanceId, {
      apple_pass_url: passUrl,
    });

    return Response.json({
      success: true,
      pass_url: passUrl,
      serial_number: serialNumber,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});