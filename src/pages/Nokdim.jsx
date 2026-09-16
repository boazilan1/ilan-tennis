import LocationPage from './LocationPage'

const defaults = {
  nokdim_hero_subtitle: 'מיקום חדש שלנו — שני מגרשי טניס, ופעילות חדשה שיוצאת לדרך בקרוב',
  nokdim_intro_text: 'אנחנו שמחים לפתוח פעילות חדשה בנוקדים!\nשני מגרשי טניס חדשים, באווירה מקצועית וקהילתית.\nהחוג מתאים לכל הגילאים והרמות — ממתחילים ועד מתקדמים.',
}

export default function Nokdim() {
  return <LocationPage prefix="nokdim" locationName="נוקדים" defaults={defaults} />
}
