const fs = require('fs');
const path = './src/lib/Translations.ts';
let code = fs.readFileSync(path, 'utf8');

const enDesc = `
    info_sym1_desc: "Adds +1 to the current total.",
    info_sym1_neg_desc: "Subtracts 1 from the current total.",
    info_sym2_desc: "Adds +1 to the current total.",
    info_sym2_neg_desc: "Subtracts 1 from the current total.",
    info_sym3_desc: "Adds the result of the previous round to the total.",
    info_sym4_desc: "Adds the result of two rounds ago to the total.",
    info_sym5_desc: "Multiplies the current total by 2.",
    info_sym6_desc: "Divides the total by 2 (decimals are ignored).",
    info_sym7_desc: "Inverts the value of all basic shapes that come after it.",
    info_sym8_desc: "Instantly resets the current total to zero.",
    info_sym9_desc: "Flips the sign of the current total (e.g., 5 becomes -5).",
    info_sym10_desc: "If present, the final result cannot drop below zero.",
`;

const trDesc = `
    info_sym1_desc: "Mevcut değere +1 ekler.",
    info_sym1_neg_desc: "Mevcut değerden 1 çıkarır.",
    info_sym2_desc: "Mevcut değere +1 ekler.",
    info_sym2_neg_desc: "Mevcut değerden 1 çıkarır.",
    info_sym3_desc: "Bir önceki turun sonucunu mevcut değere ekler.",
    info_sym4_desc: "İki önceki turun sonucunu mevcut değere ekler.",
    info_sym5_desc: "Mevcut değeri 2 ile çarpar.",
    info_sym6_desc: "Mevcut değeri 2'ye böler (kalanlar atılır).",
    info_sym7_desc: "Kendisinden sonra gelen siyah/beyaz temel şekillerin etkisini tersine çevirir.",
    info_sym8_desc: "Mevcut değeri anında sıfırlar.",
    info_sym9_desc: "Mevcut değerin işaretini değiştirir (Örn: 5 ise -5 yapar).",
    info_sym10_desc: "Ekranda belirirse, o turun sonucu asla sıfırın altına düşemez (negatif olamaz).",
`;

code = code.replace(/info_sym10: "Minus\\nGuard",/g, \`info_sym10: "Minus\\\\nGuard",\n\${enDesc}\`);
code = code.replace(/info_sym10: "Eksi\\nKoruma",/g, \`info_sym10: "Eksi\\\\nKoruma",\n\${trDesc}\`);

fs.writeFileSync(path, code);
