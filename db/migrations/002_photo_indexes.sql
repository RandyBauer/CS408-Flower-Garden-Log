-- Tag photos. A planting has at most one tag photo; attaching another replaces it.

CREATE UNIQUE INDEX photos_one_tag_per_planting ON photos(planting_id) WHERE kind = 'tag';
CREATE INDEX photos_planting_id ON photos(planting_id);
