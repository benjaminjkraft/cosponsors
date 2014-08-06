PUB_DIR=/mit/benkraft/Public/cosponsors
PUB_FILES=bundle.js index.html index.css

build:
	browserify run.js -o bundle.js -d

watch:
	watchify run.js -o bundle.js -d -v

pub:
	# no sourcemaps for "prod"
	browserify run.js -o bundle.js
	mkdir -p $(PUB_DIR)
	cp $(PUB_FILES) $(PUB_DIR)
	browserify run.js -o bundle.js -d
