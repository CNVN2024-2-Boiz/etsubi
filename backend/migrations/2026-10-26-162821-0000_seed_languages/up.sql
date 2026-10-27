INSERT INTO languages (code, name) VALUES
    ('en', 'English'),
    ('ja', 'Japanese'),
    ('vi', 'Vietnamese'),
    ('zh', 'Chinese'),
    ('ko', 'Korean'),
    ('fr', 'French'),
    ('de', 'German'),
    ('es', 'Spanish'),
    ('pt', 'Portuguese'),
    ('it', 'Italian'),
    ('ru', 'Russian'),
    ('ar', 'Arabic'),
    ('th', 'Thai'),
    ('id', 'Indonesian')
ON CONFLICT (code) DO NOTHING;
