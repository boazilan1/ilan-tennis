import LocationPage from './LocationPage'

const defaults = {
  givatzeev_hero_subtitle: 'פעילות טניס לתושבי האזור — קבוצות לילדים, לנוער ולמבוגרים',
  givatzeev_intro_text: 'אילן טניס פעיל בגבעת זאב עם קבוצות אימון לכל הגילאים והרמות.\nדגש על פיתוח גופני, תיאום תנועה, משמעת ספורטיבית ושמחת המשחק.\nאימונים פרטיים זמינים בתיאום אישי.',
}

const externalDefault = {
  url: 'https://www.givatzeev.org.il/page.php?type=hugSearch&tab=hugim&view=list&sort=name&sy=2026&hp=&cat%5B%5D=30&q=%D7%98%D7%A0%D7%99%D7%A1&sort=name',
  label: 'הרשמה דרך המתנ"ס',
}

export default function GivatZeev() {
  return <LocationPage prefix="givatzeev" locationName="גבעת זאב" defaults={defaults} externalDefault={externalDefault} />
}
