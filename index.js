module.exports = {
    get: get,
    drawCosponsorGraph: drawCosponsorGraph,
}

var d3 = require('d3');
var $ = require('jquery');
var _ = require('underscore');

var url = "https://congress.api.sunlightfoundation.com/";
var apiKey = "bdae6292d1ac4c0c890e85ab6914433c";

function _displayName(legislator) {
    return (
        legislator.first_name
        + " " + legislator.last_name
        + " (" + legislator.party
        + "-" + legislator.state + ")"
    );
}

function _color(legislator) {
    if (legislator.party == 'R') {
        return 'darkred';
    } else if (legislator.party == 'D') {
        return 'darkblue';
    } else {
        return 'darkgreen';
    }
}

function _size(legislator) {
    var size = 1 + Math.sqrt(legislator.sponsored);
    console.log(size, legislator);
    return size;
}

function _linkColor(link) {
    var lightness = 4/3 * 255 / (1 + 3 * link.weight) - 1/3 * 255;
    return "rgb(" + lightness + "," + lightness + "," + lightness + ")";
}

// Get num results.  num = 0 gets all of them.
function get(call, params, callback, inject, num, perPage, page) {
    if (num === undefined) {
        num = 1; // get the first page
    }
    if (page === undefined) {
        page = 1
    }
    params.apikey = apiKey;
    params.page = page;
    if (perPage) {
        params.per_page = perPage;
    }
    $.get(url + call, params, function (data) {
        inject(data);
        if (data.page.count == data.page.per_page
                && (num == 0 || data.page.page * data.page.count < num)) {
            get(call, params, (x) => callback(data.results.concat(x)), inject, num, perPage, page + 1);
        } else {
            callback(data.results)
        }
    })
}

// returns [people, pairs] where
//      people: array of legislator objects.  additional fields:
//          sponsored: number of sponsored bills
//      pairs: array of
//          { source: index, target: index, weight: in [0,1] }
//          where the indices are into people.
function processCosponsorResults (results) {
    var sponsor_cosponsor_pairs = _.flatten(_.map(results,
        (bill) => _.map(bill.cosponsors,
            (cosponsor) => ({
                sponsor_id: bill.sponsor.bioguide_id,
                sponsor: bill.sponsor,
                cosponsor_id: cosponsor.legislator.bioguide_id,
                cosponsor: cosponsor.legislator,
                total: bill.cosponsors.length
            }))));
    sponsor_cosponsor_pairs.sort((a,b) => (a.sponsor_id > b.sponsor_id
        || (a.sponsor_id == b.sponsor_id
            && a.cosponsor_id > b.cosponsor_id)) ? 1 : -1)

    var people_by_id = {}
    _.each(sponsor_cosponsor_pairs, (pair) => {
        if (!people_by_id[pair.sponsor_id]) {
            people_by_id[pair.sponsor_id] = pair.sponsor;
            people_by_id[pair.sponsor_id].sponsored = 0;
        }
        if (!people_by_id[pair.cosponsor_id]) {
            people_by_id[pair.cosponsor_id] = pair.cosponsor;
            people_by_id[pair.cosponsor_id].sponsored = 0;
        }
    });

    _.each(results, bill => {
        people_by_id[bill.sponsor.bioguide_id].sponsored += 1;
    });

    var ids = _.keys(people_by_id);
                 
    // now a list of unique { source, target, weight }
    var pairs = _.map(_.groupBy(sponsor_cosponsor_pairs,
            (pair) => [pair.sponsor_id, pair.cosponsor_id]),
        (related_pairs, pair) => ({
            // use related_pairs[0] because pair has been cast to a string
            source: _.indexOf(ids, related_pairs[0].cosponsor_id),
            target: _.indexOf(ids, related_pairs[0].sponsor_id),
            weight: Math.min(1, _.reduce(
                _.map(related_pairs, (p) => 1/(10 + p.total)), (x,y) => x+y)),
        }));
    console.log(pairs);

    var people = _.map(ids, id => people_by_id[id]);

    return [people, pairs]
}

function renderCosponsorGraph (people, pairs, container, width, height) {
    var force = d3.layout.force()
        .size([width, height])
        .nodes(people)
        .links(pairs)
        .gravity(1)
        .charge(-3000)
        .linkDistance(2)
        .linkStrength(link => link.weight)

    var vis = container.append("svg:svg")
        .attr("width", width)
        .attr("height", height);

    var link = vis.selectAll("line.link")
        .data(pairs)
        .enter()
        .append("svg:line")
        .attr("class", "link")
        .style("stroke", _linkColor);

    var node = vis.selectAll("g.node")
        .data(people)
        .enter()
        .append("svg:g")
        .attr("class", "node");
    node.append("svg:circle")
        .attr("r", _size)
        .style("fill", _color);
    node.call(force.drag);

    node.append("svg:text")
        .text(_displayName)
        .style("fill", _color)
        .style("font-family", "verdana,sans-serif")
        .style("font-size", "10pt");

    var updateLink = function() {
        this.attr("x1", function(d) {
            return d.source.x;
        }).attr("y1", function(d) {
            return d.source.y;
        }).attr("x2", function(d) {
            return d.target.x;
        }).attr("y2", function(d) {
            return d.target.y;
        });
    }
    var updateNode = function() {
        this.attr("transform", function(d) {
            return "translate(" + d.x + "," + d.y + ")";
        });

    }
    force.on("tick", function() {
        node.call(updateNode);
        link.call(updateLink);
    });

    $("#loading").html("");
    force.start();
};

function drawCosponsorGraph (chamber, congress, bills) {
    var load = function (data) {
        $("#loading").append("<span>.</span>");
    };
    var render = function (results) {
        var processed = processCosponsorResults(results);
        console.log(processed);
        renderCosponsorGraph(processed[0], processed[1],
            d3.select("body"), $(window).width(), $(window).height());
    }
    get('bills', {
        'congress': congress,
        'chamber': chamber,
        'cosponsors_count__gt': 0,
        'fields': 'sponsor,cosponsors.legislator'
    }, render, load, bills, 50);
}
