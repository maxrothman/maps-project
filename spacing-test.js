"use strict";

function flat_sample() {
  var step = 5;
  var canvas = document.getElementById('canvas');
  var ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  //don't do the drawing in the loop cuz it's slow
  var data = ctx.getImageData(0, 0, canvas.width, canvas.height);

  for (var x=0; x<canvas.width; x+=step) {
    for (var y=0; y<canvas.height; y+=step) {
      var idx = (y * canvas.width + x) * 4;
      data.data[idx+3] = 255;
    }
  }
  ctx.putImageData(data, 0, 0);
}

//still slow, even after removing getImageData and putImageData calls
function scaled_sample() {
  var points = [{x: 580, y: 440}],
      margin = 15,
      sample_size = 20,
      num_points = 50000,
      canvas = document.getElementById('canvas'),
      ctx = canvas.getContext('2d'),
      dot = ctx.createImageData(1,1);

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  dot.data[3] = 255

  var data = ctx.getImageData(0, 0, canvas.width, canvas.height);
  skips = 0;
  for (var i = 0; i < num_points; i++) {
    var x = rand(margin, canvas.width - margin), y = rand(margin, canvas.height - margin);
    var idx = coords2idx(x, y);
    // var area = ctx.getImageData(x - (sample_size/2), y - (sample_size/2),
    //                         x + (sample_size/2), y + (sample_size/2));
    
    var found = 0;
    for (var x1 = x - sample_size/2; x1 <= x + sample_size/2; x1++) {
      for (var y1 = y - sample_size/2; y1 <= y + sample_size/2; y1++) {
        var idx1 = coords2idx(x1, y1);
        if ((data.data[idx] === 0) && (data.data[idx+1] === 0) && 
            (data.data[idx+2] === 0) && (data.data[idx+3] === 255)) {
          found++;
        }
      }
    }


    // for (var p=0; p<area.data.length; p+=4) {
    //   var r = area.data[p], g = area.data[p+1], b = area.data[p+2], a = area.data[p+3];
    //   if ((r == 0) && (g == 0) && (b == 0) && (a == 255)) {
    //     found++;
    //   }
    // }

    var density = found / (sample_size * sample_size);
    var expected_density = get_density({x:x, y:y}, points);
    
    if (density < expected_density) {
      // ctx.putImageData(dot, x, y);
      data.data[idx+3] = 255;
    } else {skips++;}
  }
  ctx.putImageData(data, 0, 0);
}

function get_density(point, origins) {
  var origin = origins[0];
  var stddev = 100;
  return Math.exp(-1/(2*stddev*stddev) * ( Math.pow(point.x-origin.x, 2) + Math.pow(point.y-origin.y, 2) ));
}

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function show_density() {
  var canvas = document.getElementById('canvas'),
      ctx = canvas.getContext('2d');

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  var points = [{x: Math.round(canvas.width/2), y: Math.round(canvas.height/2)}];

  //don't do the drawing in the loop cuz it's slow
  var data = ctx.getImageData(0, 0, canvas.width, canvas.height);

  for (var x=0; x<canvas.width; x++) {
    for (var y=0; y<canvas.height; y++) {
      var idx = (y * canvas.width + x) * 4;
      var density = get_density({x:x, y:y}, points);
      //mapping density range (0-15) onto alpha range (0-255)
      if (density == Infinity) {
        data.data[idx+3] = 255;
      } else {
        data.data[idx+3] = (255) * density;
      }
    }
  }
  ctx.putImageData(data, 0, 0);
  return data;
}

function coords2idx(x, y) {
  return (x * canvas.width + y) * 4;
}

function k_means() {
  var origins = [{x: 580, y: 440}],
      num_points = 100,
      every_nth = 100,
      canvas = document.getElementById('canvas'),
      ctx = canvas.getContext('2d'),
      imgdata = ctx.getImageData(0, 0, canvas.width, canvas.height),
      data = imgdata.data,
      centroids = [],
      assignments = {};

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  for (var i=0; i<num_points; i++) {
    centroids[i] = {x: rand(0, canvas.width), y: rand(0, canvas.height)};
  }

  var movement = true;
  while (movement) {
    
    //find the nearest centroid for each point
    for (var x=0; x<canvas.width; x+=every_nth) {
      for (var y=0; y<canvas.height; y+=every_nth) {
        var min = Infinity;
        for (var ctidx=0; ctidx<centroids.length; ctidx++) {
          centroid = centroids[ctidx];
          var newdist = dist({x:x, y:y}, centroid);
          if (newdist < min) {
            min = newdist;
            minidx = ctidx;
          }
        }
        if (assignments[ctidx] === undefined) {
          assignments[ctidx] = [];
        }
        assignments[ctidx].push({x:x, y:y});
      }
    }

    //move the centroids
    movement = false;
    for (var c=0; c<centroids.length; c++) {
      var centroid = centroids[c];
      var assignment = assignments[c];

      var sum = 0;
      for (var p = 0; p < assignment.length; p++) {
        var pt = assignment[p];
        xsum += (centroid.x - pt.x) * get_density(pt, origins);
        ysum += (centroid.y - pt.y) * get_density(pt, origins);
      }
      xsum /= assignment.length;
      ysum /= assignment.length;
      if ((centroid.x !== xsum) && centroid.y !== ysum) {
        moved = true;
        centroid.x = xsum; centroid.y = ysum;
      }
    }
  }
  console.log('done');
}

function dist(pt1, pt2) {
  return Math.sqrt(Math.pow(pt2.x - pt1.x, 2) + Math.pow(pt2.y - pt1.y, 2));
}

function pt2str(x, y) {
  return x + ',' + y;
}


function center_of_mass() {
  var origins = [{x: 580, y: 440}],
      skip = 20,
      canvas = document.getElementById('canvas'),
      ctx = canvas.getContext('2d'),
      imgdata = ctx.getImageData(0, 0, canvas.width, canvas.height),
      data = imgdata.data;

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

}

//iterate over contiguous squares, as many fit in the space.
//block_size is the length of each side of the square
function iterate_contiguous_blocks(block_size, placement_function, data) {
  for(var x=0; x+block_size<canvas.width; x+=block_size) {
    for (var y=0; y+block_size<canvas.height; y+=block_size) {
      com = get_com(x, y, x+block_size, y+block_size);
      draw_pixel(com.x, com.y, data);
    }
  }
}

function draw_pixel(x, y, data) {
  data[coords2idx(x, y) + 3] = 255;
}

//Using the analogy of a mass density distribution, this returns the coordinates
// of the center of mass of the area bounded by x1 -> x2, y1 -> y2.
//It's 1/M ∫ p(r)*r dr, where r is a coordinate, p(r) is a density function,
// and M is the result of get_mass().
//Here, we use a gaussian for our density function, e^(-1/2(x^2+y^2))
function get_com(x1, y1, x2, y2) {
  var mass = get_mass(x1, y1, x2, y2);
  
  function y_integral(x, y) {
    return x + Math.sqrt(Math.PI/2) * Math.pow(Math.E, y*y/2) * erfi(x/Math.sqrt(2));
  }
  function x_integral(x, y) {
    return x + Math.sqrt(Math.PI/2) * Math.pow(Math.E, x*x/2) * erfi(y/Math.sqrt(2));
  }

  return {
    x: (1/mass) * (x_integral(x2, y2) - x_integral(x1, y1)),
    y: (1/mass) * (y_integral(x2, y2) - y_integral(x1, y1))
  };
}


//Using the analogy of a mass density distribution, this returns the total mass
// of the area bounded by x1 -> x2, y1 -> y2.
//It's the integral of the density over the area.
//Here, we use a gaussian for our density function, e^(-1/2(x^2+y^2))
function get_mass(x1, y1, x2, y2) {
  function integral(x, y) {
    return y + 1/2 * Math.PI * erf(x/Math.sqrt(2)) * erf(y/Math.sqrt(2));
  }

  return integral(x2, y2) - integral(x1, y1);
}

//Approximtes the error function, which comes out of the integral of the gaussian.
//Uses first approximation found here: https://en.wikipedia.org/wiki/Error_function#Approximation_with_elementary_functions
//Maximum error: 5e-4
function erf(x) {
  var a1 = 0.278393,
      a2 = 0.230389,
      a3 = 0.000927,
      a4 = 0.078108;

  return 1/Math.pow(1 + a1*x + a2*x*x + a3*x*x*x + a4*x*x*x*x, 4);
}

//Approximates the imaginary error function, which comes out of the integral
//in calculating the center of mass.
//Uses order n=3 optimized for best absolute error with function found here:
//http://www.ebyte.it/library/codesnippets/DawsonIntegralApproximations.html
//Maximum absolute error: 1.19e-4
function erfi(x) {
  var p1 = 0.1154998994,
      p2 = 0.0338088612,
      p3 = 0.0106523108,
      q1 = 0.7790120439,
      q2 = 0.3023475798,
      q3 = 0.0533374765;

  var dawson = (1 + x*(p1 + x*(p2 + x*p3))) / (1 + x*(q1 + x*(q2 + x*(q3 + 2*p3*x))));
  return 2/Math.sqrt(Math.PI) * Math.pow(Math.E, x*x) * dawson;
}


function scaled_skipping() {
  /* This would work great in the case of a normal distribution with a single
  maximum because I could simply do a single quadrant then rotate it around
  the center. That shortcut unfortunately fails when there is >1 maximum. */

  var minstep = 2,
    stepscale = 10,
    canvas = document.getElementById('canvas'),
    ctx = canvas.getContext('2d');

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  var points = [{x: Math.round(canvas.width/2), y: Math.round(canvas.height/2)}];

  //don't do the drawing in the loop cuz it's slow
  var data = ctx.getImageData(0, 0, canvas.width, canvas.height);
  
  var x, new_prevrows, prevrows, prevy, prevy_idx, prevy_boundary, drew;

  //this will become prevrows in the first iteration of the outer loop
  //we need 2 items so the initialization works properly
  new_prevrows = [
    {pt: {x: 0,            y: 0}, ystep: 0},
    {pt: {x: canvas.width, y: 0}, ystep: 0}
  ];
  
  for (var y = 0; y < canvas.height; y++) {

    //rotate prevrows
    prevrows = new_prevrows;
    new_prevrows = [];

    // Split the row into regions around the points in that row.
    // The boundary between each region is halfway in between each point.
    prevy_idx = 0;
    prevy = prevrows[prevy_idx];
    prevy_boundary = (prevy.pt.x + prevrows[1].pt.x) / 2;

    x = 0, drew = false;
    while (x < canvas.width) {

      // if we've skipped a sufficient number of pixels in y, draw & reset step
      // we've already ensured we've skipped enough in x by jumping by xstep
      if (y >= prevy.pt.y + prevy.ystep) {
        //draw
        console.log(x + ',' + y);
        var idx = (y * canvas.width + x) * 4;
        // data.data[idx+3] = 255;
        ctx.fillRect(x, y, 1, 1);

        new_prevrows.push({
          pt: {x: x, y: y},
          ystep: Math.round(stepscale * (1 - get_density({x:x, y:y}, points)) + minstep)
        });
        drew = true;
      }

      //ranges between minstep -> stepscale+minstep
      //get_density() should range between 0->1
      var xstep = Math.round(stepscale * (1 - get_density({x:x, y:y}, points)) + minstep);
      x += xstep;

      //do this last on the new x because otherwise, if the last point
      //needs to be pushed, we break the loop before pushing it
      if (x > prevy_boundary) {
        // if we didn't draw anything in this column, pass the old value through
        if (!drew) {
          new_prevrows.push(prevy);
        }
        drew = false;

        //switch to the next column
        prevy_idx += 1;
        prevy = prevrows[prevy_idx];

        // handle the edge of the canvas
        if (prevy_idx+1 >= prevrows.length) {
          prevy_boundary = canvas.width;
        } else {
          prevy_boundary = (prevy.pt.x + prevrows[prevy_idx+1].pt.x) / 2;
        }
      }
    }
    // ctx.putImageData(data, 0, 0);
  }
}

//turns out I'm looking for a sort of cumulative distribution function,
//not an integral of the gaussian
/*
function gaussian_integral_2d(x, y) {
  return 0.5 * Math.sqrt(Math.PI/2) * Math.exp(-y*y/2) * erf(x/Math.sqrt(2))
}

function test_gaussian_integral_2d() {
  var canvas = document.getElementById('canvas'),
      ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  var data = ctx.getImageData(0, 0, canvas.width, canvas.height);

  // for (var x=0; x<canvas.width; x++) {
    // for (var y=0; y<canvas.height; y++) {
  for (var x=)
      var idx = (y * canvas.width + x) * 4;
      var value = gaussian_integral_2d(x, y);
      //mapping function range (-.5 to .5) onto alpha range (0-255)
      data.data[idx+3] = (value + 0.5) * 255
    }
  }
  ctx.putImageData(data, 0, 0);
}
*/

/* erf must be no good, but the cumulative dist approximation
   by totalling works fine
*/
function test_cumulative() {
  var canvas = document.getElementById('canvas'),
      ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  var y = 400, total = 0, gaussian, frac_x;
  
  for (var x=0; x<500; x++) {
    frac_x = (x-200) * .01;
    gaussian = Math.exp(-frac_x*frac_x);
    total += gaussian;
    ctx.fillStyle = 'black';
    ctx.fillRect(x, y - gaussian*200, 1, 1);
    ctx.fillStyle = 'green';
    var cdf = (1/2 * (1 + erf(frac_x/Math.sqrt(2))));
    ctx.fillRect(x, y - cdf*100, 1, 1);
    ctx.fillStyle = 'red';
    ctx.fillRect(x, y - total, 1, 1);

  }
}


function show_cumulative() {
  var canvas = document.getElementById('canvas'),
      ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  var data = ctx.getImageData(0, 0, canvas.width, canvas.height);


  var origins = [{x: 580, y: 440}];

  var z, total, idx;

  //main loop
  for (var y=0; y<canvas.height; y++) {
    total = 0;
    for (var x=0; x<canvas.width; x++) {
      z = get_density({x: x, y: y}, origins);
      total += z;

      //draw
      idx = (y * canvas.width + x) * 4;
      data.data[idx+3] = total;

    }
  }
  ctx.putImageData(data, 0, 0);
}

function mesh_skipping() {
  var canvas = document.getElementById('canvas'),
      ctx = canvas.getContext('2d');

  
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  var data = ctx.getImageData(0, 0, canvas.width, canvas.height);

  /*
    start with x=0, y=0, z=f(x,y)
    move `step` along the surface defined by f in the +x direction
    store where every point went
    next row, draw the point `step` below the previous one along the surface defined by f
  */
  var step = 10, x = 0, y = 0;
  draw_pixel(x, y, data);
  
  while (y < canvas.height) {
    while (x < canvas.width) {

    }
  }
}

// show_density();
// scaled_sample();
// k_means()
// flat_sample();
// scaled_skipping();
// test_cumulative();
show_cumulative();

//682x199
//701x200

/*
- Could use top-down view of mesh with equal-length edges
- once you collapse the z-axis, verticies on the mesh where there was mostly
  z-movement look close together
- Wait, that shows rate of change like a topo map, not density (height)
- what if we did that to the graph of the integral of the function? Then
  higher rate of change would be the same as height of the original function
  (now the derivative)
- Rather than taking a flat grid and deforming it, think about it as laying a map
  of points on top of the function surface where every point is equidistant from
  its neighbors along the surface defined by the function
  - still doesn't work, you can't make any shape this way you can't make out of
    rectangles joined at angles
  - e.g you can make a gaussian curve that varies in x, but not one that varies
    in x and y. For that, you need non-square polygons
  - if you add flexibility in one dimension but not the other, it doesn't go back
    to looking like a nice grid on the other side

This could work
- let f be a function such that the slope of f is proportional to the magnitude of
  the gaussian function, but that f's magnitude decreases when the gaussian's
  magnitude decreases.
- I want the absolute value!
- (-|erf(x)| + 1)(-|erf(y) + 1) gets pretty close, except it's not circularly
  symmetric
- |-1/(x^2+y^2)| might work if you truncate at x=0 y=0
  - circularly symmetric
  - slope continuously increases when approaching 0
- Now we can grid this and it'll do what we want
  - gridding might be hard? This might prove challenging

Now that we have the function, how to we grid it?
- When placing a next point (moving along x), try to put it a set distance away
  along the surface
- check how far away the corresponding previous y point is
- if ydist > xdist, increase xdist until they're equal
- thus all the x lines are parallel and all the y lines are parallel
  but the squares end up more like stretched diamonds
- DOESN'T WORK
- The way mac grapher's gridding works is:
  - start with a flat grid, all pts equidistant in x and y
  - move each point up/down in z until it's on the surface
  - thus if you collapse z, you end up back with a flat grid
- My method stretches xdist until it's equal to ydist
  - if when doing so you keep the grid lines parallel, then xdist will increase
    until you get the same result as mac grapher's method
  - if you don't keep the grid lines parallel, all hell breaks loose

  If you allow the grid lines to stretch along the surface, then you lose the
  property of un-stretchy lines where the points get closer together when
  viewed from the top
  Meaning when you collapse the z-dimension you just end up with a flat grid

- Next steps: look at methods of mesh and grid generation
  Those are designed to make a rendition of a shape using polygons
  and hopefully the area of the polygons can be limited

- Alternative: rather than skipping in x and y, skip in r and θ
  - no good: what about multiple centers? Where do you center your coordinates?


- New idea: follow gradient with some sort of initial velocity?
*/