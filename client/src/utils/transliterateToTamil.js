// Comprehensive Phonetic English to Tamil Transliterator Utility

const customDict = {
  'pandiyan': 'பாண்டியன்',
  'vinesh': 'வினேஷ்',
  'vineshpandiyan': 'வினேஷ் பாண்டியன்',
  'vinesh pandiyan': 'வினேஷ் பாண்டியன்',
  'parvathii': 'பார்வதி',
  'parvathi': 'பார்வதி',
  'durga': 'துர்கா',
  'ushaa': 'உஷா',
  'usha': 'உஷா',
  'ganeshan': 'கணேசன்',
  'ganesh': 'கணேஷ்',
  'sample': 'மாதிரி',
  'sample name': 'மாதிரி பெயர்',
  'superadmin': 'சூப்பர் அட்மின்',
  'testing': 'சோதனை',
  'denalai': 'தேனலை'
};

const consonantMap = [
  { key: 'shh', char: 'ஷ', pulli: 'ஷ்' },
  { key: 'sh', char: 'ஷ', pulli: 'ஷ்' },
  { key: 'zh', char: 'ழ', pulli: 'ழ்' },
  { key: 'th', char: 'த', pulli: 'த்' },
  { key: 'dh', char: 'த', pulli: 'த்' },
  { key: 'ch', char: 'ச', pulli: 'ச்' },
  { key: 'kh', char: 'க', pulli: 'க்' },
  { key: 'gh', char: 'க', pulli: 'க்' },
  { key: 'ph', char: 'ப', pulli: 'ப்' },
  { key: 'bh', char: 'ப', pulli: 'ப்' },
  { key: 'nj', char: 'ஞ', pulli: 'ஞ்' },
  { key: 'ng', char: 'ங', pulli: 'ங்' },
  { key: 'nd', char: 'ந்த', pulli: 'ந்த்' },
  { key: 'nt', char: 'ந்த', pulli: 'ந்த்' },
  { key: 'mp', char: 'ம்ப', pulli: 'ம்ப்' },
  { key: 'mb', char: 'ம்ப', pulli: 'ம்ப்' },
  { key: 'ck', char: 'க', pulli: 'க்' },
  { key: 'kk', char: 'க', pulli: 'க்' },
  { key: 'tt', char: 'த', pulli: 'த்' },
  { key: 'pp', char: 'ப', pulli: 'ப்' },
  { key: 'ss', char: 'ஸ', pulli: 'ஸ்' },
  { key: 'nn', char: 'ன', pulli: 'ன்' },
  { key: 'mm', char: 'ம', pulli: 'ம்' },
  { key: 'll', char: 'ல', pulli: 'ல்' },
  { key: 'rr', char: 'ர', pulli: 'ர்' },
  { key: 'k', char: 'க', pulli: 'க்' },
  { key: 'c', char: 'ச', pulli: 'ச்' },
  { key: 'g', char: 'க', pulli: 'க்' },
  { key: 'j', char: 'ஜ', pulli: 'ஜ்' },
  { key: 'z', char: 'ஸ', pulli: 'ஸ்' },
  { key: 't', char: 'த', pulli: 'த்' },
  { key: 'd', char: 'த', pulli: 'த்' },
  { key: 'p', char: 'ப', pulli: 'ப்' },
  { key: 'b', char: 'ப', pulli: 'ப்' },
  { key: 'm', char: 'ம', pulli: 'ம்' },
  { key: 'y', char: 'ய', pulli: 'ய்' },
  { key: 'r', char: 'ர', pulli: 'ர்' },
  { key: 'l', char: 'ல', pulli: 'ல்' },
  { key: 'v', char: 'வ', pulli: 'வ்' },
  { key: 'w', char: 'வ', pulli: 'வ்' },
  { key: 'h', char: 'ஹ', pulli: 'ஹ்' },
  { key: 'f', char: 'ப', pulli: 'ப்' },
  { key: 'x', char: 'க்ஸ', pulli: 'க்ஸ்' }
];

const initialVowels = [
  { key: 'anand', char: 'ஆனந்த்' },
  { key: 'aar', char: 'ஆர்' },
  { key: 'aa', char: 'ஆ' },
  { key: 'ee', char: 'ஈ' },
  { key: 'ii', char: 'ஈ' },
  { key: 'oo', char: 'ஊ' },
  { key: 'uu', char: 'ஊ' },
  { key: 'ai', char: 'ஐ' },
  { key: 'au', char: 'ஔ' },
  { key: 'ou', char: 'ஔ' },
  { key: 'a', char: 'அ' },
  { key: 'e', char: 'எ' },
  { key: 'i', char: 'இ' },
  { key: 'o', char: 'ஒ' },
  { key: 'u', char: 'உ' }
];

const dependentVowels = [
  { key: 'aa', char: 'ா' },
  { key: 'ee', char: 'ீ' },
  { key: 'ii', char: 'ீ' },
  { key: 'oo', char: 'ூ' },
  { key: 'uu', char: 'ூ' },
  { key: 'ai', char: 'ை' },
  { key: 'au', char: 'ௌ' },
  { key: 'ou', char: 'ௌ' },
  { key: 'ay', char: 'ாய்' },
  { key: 'ey', char: 'ே' },
  { key: 'a', char: '' },
  { key: 'e', char: 'ே' },
  { key: 'i', char: 'ி' },
  { key: 'o', char: 'ோ' },
  { key: 'u', char: 'ு' }
];

export function transliterateWordToTamil(word) {
  if (!word || typeof word !== 'string') return word;
  
  // Don't alter if pure numbers or non-alphabetic
  if (!/[a-zA-Z]/.test(word)) return word;

  const lower = word.toLowerCase();

  if (customDict[lower]) {
    return customDict[lower];
  }

  let str = lower;
  let result = '';
  let i = 0;

  // Initial Vowel check
  for (let v of initialVowels) {
    if (str.startsWith(v.key)) {
      result += v.char;
      i += v.key.length;
      break;
    }
  }

  while (i < str.length) {
    let matchedConsonant = false;

    let cList = consonantMap;
    if (i === 0) {
      if (str[i] === 'n') {
        cList = [{ key: 'n', char: 'ந', pulli: 'ந்' }, ...consonantMap];
      } else if (str[i] === 's' && !str.startsWith('sh', i)) {
        cList = [{ key: 's', char: 'ச', pulli: 'ச்' }, ...consonantMap];
      }
    } else {
      if (str[i] === 'n') {
        if (str.substring(i) === 'nan') {
          result += 'ணன்';
          i += 3;
          matchedConsonant = true;
          break;
        }
        cList = [{ key: 'n', char: 'ன', pulli: 'ன்' }, ...consonantMap];
      } else if (str[i] === 's' && !str.startsWith('sh', i)) {
        cList = [{ key: 's', char: 'ஸ', pulli: 'ஸ்' }, ...consonantMap];
      }
    }

    for (let c of cList) {
      if (str.startsWith(c.key, i)) {
        let consKeyLen = c.key.length;
        i += consKeyLen;

        let matchedVowel = false;

        if (str.substring(i) === 'ay') {
          result += (c.key === 'j' ? 'ஜய்' : c.char + 'ாய்');
          i += 2;
          matchedVowel = true;
        } else if (str.substring(i) === 'ar') {
          result += c.char + (c.key === 'nd' || c.key === 'nt' ? 'ர்' : 'ார்');
          i += 2;
          matchedVowel = true;
        } else if (str.substring(i) === 'an') {
          if (c.key === 'd' || c.key === 't' || c.key === 'nd' || c.key === 'nt' || c.key === 'th') {
            result += c.char + 'ன்';
          } else if (c.key === 'g' || c.key === 'k') {
            result += c.char + 'ன்';
          } else {
            result += c.char + 'ான்';
          }
          i += 2;
          matchedVowel = true;
        } else if (str.substring(i) === 'esh') {
          result += c.char + 'ேஷ்';
          i += 3;
          matchedVowel = true;
        } else if (str.substring(i) === 'artik' || str.substring(i) === 'arthik') {
          result += c.char + 'ார்த்திக்';
          i += str.substring(i).length;
          matchedVowel = true;
        } else {
          for (let v of dependentVowels) {
            if (str.startsWith(v.key, i)) {
              if (v.key === 'a') {
                if (i + 1 === str.length) {
                  result += c.char + 'ா';
                } else if (i === 1 && (c.key === 'r' || c.key === 'j' || c.key === 'm' || c.key === 'k' || c.key === 'p' || c.key === 'b')) {
                  if (str.substring(i + 1) === 'j' || str.substring(i + 1) === 'jesh' || str.substring(i + 1) === 'ja') {
                    result += c.char + 'ா';
                  } else {
                    result += c.char;
                  }
                } else {
                  result += c.char;
                }
              } else if (v.key === 'e') {
                if (c.key === 's' || c.key === 'ch') {
                  result += c.char + 'ெ';
                } else {
                  result += c.char + v.char;
                }
              } else {
                result += c.char + v.char;
              }
              i += v.key.length;
              matchedVowel = true;
              break;
            }
          }
        }

        if (!matchedVowel) {
          result += c.pulli;
        }

        matchedConsonant = true;
        break;
      }
    }

    if (!matchedConsonant) {
      let matchedVowel = false;
      for (let v of dependentVowels) {
        if (str.startsWith(v.key, i)) {
          result += v.char;
          i += v.key.length;
          matchedVowel = true;
          break;
        }
      }

      if (!matchedVowel) {
        result += str[i];
        i++;
      }
    }
  }

  return result;
}

export function transliterateToTamil(text) {
  if (!text || typeof text !== 'string') return text;

  // Replace each English word token with its Tamil transliteration
  return text.replace(/\b[A-Za-z]+\b/g, (word) => transliterateWordToTamil(word));
}
