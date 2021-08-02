class Helpers {
  static normalize(str) {
    if (str.length === 1) {
      return '0' + str;
    }
    return str;
  }

  static toHex(arr, lineBreak = true) {
    let hex = '';
    let index = 0;
    for (const v of arr) {
      hex += this.normalize(v.toString(16));
      index++;
      if (index === 16 && lineBreak) {
        hex += '\n';
        index = 0;
      }
    }

    return hex.toUpperCase();
  }

  static toDec(text) {
    let start = 0;
    let end = 2;
    let result = [];

    let val = '';
    do {
      val = text.slice(start, end);
      start += 2;
      end += 2;
      if (val !== '') {
        result.push(parseInt(val, 16));
      }
    } while (val !== '');

    return result;
  }

  static dataToHex(sector, data) {
    let hex = [];

    for (let a = 0; a < 3; a++) {
      let start = sector * 4 * 16 + 16 * a;
      let line = [];
      for (let i = 0; i < 16; i++) {
        line.push(data[start + i]);
      }
      hex.push(this.toHex(line, false));
    }
    return hex;
  }

  static toEuros(amount) {
    return (amount / 100).toFixed(2) + '€';
  }
}

export default Helpers;
