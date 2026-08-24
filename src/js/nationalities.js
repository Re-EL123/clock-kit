export const NATIONALITIES = [
  'South African',
  'Zimbabwean',
  'Malawian',
  'Mozambican',
  'Basotho',
  'Swati',
  'Namibian',
  'Motswana',
  'Zambian',
  'Angolan',
  'Congolese (DRC)',
  'Nigerian',
  'Ghanaian',
  'Kenyan',
  'Ugandan',
  'Tanzanian',
  'Indian',
  'Pakistani',
  'Bangladeshi',
  'Chinese',
  'British',
  'Other',
];

export function nationalitySelect(el) {
  return el('select', { class: 'input' }, [
    el('option', { value: '', text: 'Select nationality' }),
    ...NATIONALITIES.map((name) => el('option', { value: name, text: name })),
  ]);
}
