type StoredZipFile = {
  filename: string;
  data: Uint8Array;
  modifiedAt?: Date;
};

const textEncoder = new TextEncoder();
const crcTable = buildCrcTable();

function buildCrcTable(): Uint32Array {
  const table = new Uint32Array(256);

  for (let i = 0; i < 256; i += 1) {
    let value = i;

    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }

    table[i] = value >>> 0;
  }

  return table;
}

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;

  for (const byte of data) {
    crc = crcTable[(crc ^ byte) & 0xff]! ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function getDosDateTime(date = new Date()): { time: number; date: number } {
  const year = Math.max(1980, date.getFullYear());
  const time =
    (date.getHours() << 11) |
    (date.getMinutes() << 5) |
    Math.floor(date.getSeconds() / 2);
  const dosDate =
    ((year - 1980) << 9) |
    ((date.getMonth() + 1) << 5) |
    date.getDate();

  return { time, date: dosDate };
}

function createHeader(length: number): Buffer {
  return Buffer.alloc(length);
}

function toBuffer(data: Uint8Array): Buffer {
  return Buffer.from(data.buffer, data.byteOffset, data.byteLength);
}

export function createStoredZip(files: Array<StoredZipFile>): Buffer {
  const localParts: Array<Buffer> = [];
  const centralParts: Array<Buffer> = [];
  let offset = 0;

  for (const file of files) {
    const filenameBytes = textEncoder.encode(file.filename);
    const dataBuffer = toBuffer(file.data);
    const checksum = crc32(file.data);
    const { time, date } = getDosDateTime(file.modifiedAt);

    if (filenameBytes.byteLength > 0xffff) {
      throw new Error(`Filename is too long for ZIP: ${file.filename}`);
    }

    if (dataBuffer.byteLength > 0xffffffff || offset > 0xffffffff) {
      throw new Error("ZIP64 archives are not supported for this download.");
    }

    const localHeader = createHeader(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0x0800, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt16LE(time, 10);
    localHeader.writeUInt16LE(date, 12);
    localHeader.writeUInt32LE(checksum, 14);
    localHeader.writeUInt32LE(dataBuffer.byteLength, 18);
    localHeader.writeUInt32LE(dataBuffer.byteLength, 22);
    localHeader.writeUInt16LE(filenameBytes.byteLength, 26);
    localHeader.writeUInt16LE(0, 28);

    localParts.push(localHeader, toBuffer(filenameBytes), dataBuffer);

    const centralHeader = createHeader(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0x0800, 8);
    centralHeader.writeUInt16LE(0, 10);
    centralHeader.writeUInt16LE(time, 12);
    centralHeader.writeUInt16LE(date, 14);
    centralHeader.writeUInt32LE(checksum, 16);
    centralHeader.writeUInt32LE(dataBuffer.byteLength, 20);
    centralHeader.writeUInt32LE(dataBuffer.byteLength, 24);
    centralHeader.writeUInt16LE(filenameBytes.byteLength, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);

    centralParts.push(centralHeader, toBuffer(filenameBytes));
    offset += localHeader.byteLength + filenameBytes.byteLength + dataBuffer.byteLength;
  }

  const centralDirectorySize = centralParts.reduce((sum, part) => sum + part.byteLength, 0);
  const centralDirectoryOffset = offset;

  if (files.length > 0xffff || centralDirectorySize > 0xffffffff || centralDirectoryOffset > 0xffffffff) {
    throw new Error("ZIP64 archives are not supported for this download.");
  }

  const endOfCentralDirectory = createHeader(22);
  endOfCentralDirectory.writeUInt32LE(0x06054b50, 0);
  endOfCentralDirectory.writeUInt16LE(0, 4);
  endOfCentralDirectory.writeUInt16LE(0, 6);
  endOfCentralDirectory.writeUInt16LE(files.length, 8);
  endOfCentralDirectory.writeUInt16LE(files.length, 10);
  endOfCentralDirectory.writeUInt32LE(centralDirectorySize, 12);
  endOfCentralDirectory.writeUInt32LE(centralDirectoryOffset, 16);
  endOfCentralDirectory.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, ...centralParts, endOfCentralDirectory]);
}
