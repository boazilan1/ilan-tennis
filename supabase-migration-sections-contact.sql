-- Activity sections (editable from admin)
CREATE TABLE IF NOT EXISTS activity_sections (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  subtitle text,
  icon text DEFAULT '🎾',
  color_hex text DEFAULT '#1a472a',
  bg_hex text DEFAULT '#f0f7f0',
  border_hex text DEFAULT '#c5ddc5',
  content text,
  image_url text,
  link_url text,
  link_label text,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE activity_sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read activity_sections" ON activity_sections FOR SELECT USING (true);
CREATE POLICY "Admin all activity_sections" ON activity_sections FOR ALL USING (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

INSERT INTO activity_sections (title, subtitle, icon, color_hex, bg_hex, border_hex, content, sort_order) VALUES
('ציפורי', 'מגרשי טניס בסמוך להר הרצל', '🎾', '#1a472a', '#f0f7f0', '#c5ddc5',
 E'שני מגרשי טניס המספקים אווירה מקצועית, ספורטיבית ומהנה.\nחוגים בימי שלישי וחמישי — קבוצות לפי גיל ורמה לילדים, נוער ומבוגרים.\nאימונים פרטיים זמינים בתיאום. השתתפות בתוכניות "עמית", MOVE ו-freefit.', 1),
('גבעת זאב', 'פעילות טניס לתושבי האזור', '📍', '#1d4ed8', '#eff6ff', '#bfdbfe',
 E'קבוצות אימון לילדים ולנוער — מתחילים ומתקדמים.\nדגש על פיתוח גופני, תיאום תנועה, משמעת ספורטיבית ושמחת המשחק.\nאימונים פרטיים זמינים בתיאום.', 2),
('בתי ספר בירושלים', 'תוכניות חינוכיות ניידות', '🏫', '#7c3aed', '#f5f3ff', '#ddd9fe',
 E'ציוד נייד מלא — רשתות, כדורים ומחבטים — מתאים לכל מרחב.\nתוכניות מובנות לפיתוח מיומנויות מוטוריות, תיאום, עבודת צוות וביטחון עצמי.\nמתאים לכיתות א׳–י״ב.', 3),
('מחנות ותחרויות', 'לשחקנים בכל הרמות', '🏕️', '#b45309', '#fffbeb', '#fde68a',
 E'מחנות אימון עצימים לשיפור מהיר של רמת המשחק.\nתחרויות פנימיות ואזוריות — התמודדות, התפתחות ושמחה.\nפרטים על מחנות ותחרויות קרובות — צרו קשר.', 4);

-- Contact form submissions
CREATE TABLE IF NOT EXISTS contact_submissions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  message text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone insert contact" ON contact_submissions FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin read contact" ON contact_submissions FOR SELECT USING (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
