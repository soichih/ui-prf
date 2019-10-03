
function map_value(v, in_min, in_max, out_min, out_max) {
    return (v - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}

// Returns the inverse of matrix `M`.
function matrix_invert(M){
    // I use Guassian Elimination to calculate the inverse:
    // (1) 'augment' the matrix (left) by the identity (on the right)
    // (2) Turn the matrix on the left into the identity by elemetry row ops
    // (3) The matrix on the right is the inverse (was the identity matrix)
    // There are 3 elemtary row ops: (I combine b and c in my code)
    // (a) Swap 2 rows
    // (b) Multiply a row by a scalar
    // (c) Add 2 rows
    
    //if the matrix isn't square: exit (error)
    if(M.length !== M[0].length){return;}
    
    //create the identity matrix (I), and a copy (C) of the original
    var i=0, ii=0, j=0, dim=M.length, e=0, t=0;
    var I = [], C = [];
    for(i=0; i<dim; i+=1){
        // Create the row
        I[I.length]=[];
        C[C.length]=[];
        for(j=0; j<dim; j+=1){
            
            //if we're on the diagonal, put a 1 (for identity)
            if(i==j){ I[i][j] = 1; }
            else{ I[i][j] = 0; }
            
            // Also, make the copy of the original
            C[i][j] = M[i][j];
        }
    }
    
    // Perform elementary row operations
    for(i=0; i<dim; i+=1){
        // get the element e on the diagonal
        e = C[i][i];
        
        // if we have a 0 on the diagonal (we'll need to swap with a lower row)
        if(e==0){
            //look through every row below the i'th row
            for(ii=i+1; ii<dim; ii+=1){
                //if the ii'th row has a non-0 in the i'th col
                if(C[ii][i] != 0){
                    //it would make the diagonal have a non-0 so swap it
                    for(j=0; j<dim; j++){
                        e = C[i][j];       //temp store i'th row
                        C[i][j] = C[ii][j];//replace i'th row by ii'th
                        C[ii][j] = e;      //repace ii'th by temp
                        e = I[i][j];       //temp store i'th row
                        I[i][j] = I[ii][j];//replace i'th row by ii'th
                        I[ii][j] = e;      //repace ii'th by temp
                    }
                    //don't bother checking other rows since we've swapped
                    break;
                }
            }
            //get the new diagonal
            e = C[i][i];
            //if it's still 0, not invertable (error)
            if(e==0){return}
        }
        
        // Scale this row down by e (so we have a 1 on the diagonal)
        for(j=0; j<dim; j++){
            C[i][j] = C[i][j]/e; //apply to original matrix
            I[i][j] = I[i][j]/e; //apply to identity
        }
        
        // Subtract this row (scaled appropriately for each row) from ALL of
        // the other rows so that there will be 0's in this column in the
        // rows above and below this one
        for(ii=0; ii<dim; ii++){
            // Only apply to other rows (we want a 1 on the diagonal)
            if(ii==i){continue;}
            
            // We want to change this element to 0
            e = C[ii][i];
            
            // Subtract (the row above(or below) scaled by e) from (the
            // current row) but start at the i'th column and assume all the
            // stuff left of diagonal is 0 (which it should be if we made this
            // algorithm correctly)
            for(j=0; j<dim; j++){
                C[ii][j] -= e*C[i][j]; //apply to original matrix
                I[ii][j] -= e*I[i][j]; //apply to identity
            }
        }
    }
    
    //we've done all operations, C should be the identity
    //matrix I should be the inverse:
    return I;
}
//

function hsl_to_rgb(h, s, l) {
    //convert hsl to rgb
    let c = (1 - Math.abs(2 * l - 1)) * s;
    let x1 = c * (1 - Math.abs((h / 60) % 2 - 1));
    let m = l - c/2;
    let r = 0;
    let g = 0;
    let b = 0;
    if (0 <= h && h < 60) {
        r = c; g = x1; b = 0;
    } else if (60 <= h && h < 120) {
        r = x1; g = c; b = 0;
    } else if (120 <= h && h < 180) {
        r = 0; g = c; b = x1;
    } else if (180 <= h && h < 240) {
        r = 0; g = x1; b = c;
    } else if (240 <= h && h < 300) {
        r = x1; g = 0; b = c;
    } else if (300 <= h && h < 360) {
        r = c; g = 0; b = x1;
    }
    r = Math.round((r + m) * 255);
    g = Math.round((g + m) * 255);
    b = Math.round((b + m) * 255);
    //color.setXYZ(i, r, g, b);
    return {r,g,b};
}

new Vue({
    el: '#app',
    data: function() {
        return {
            //threejs things
            t: {
                renderer: null,
                scene: null,
                camera: null,
                controls: null,

                camera_light: null,
            },

            mesh: {
                lh: null,
                rh: null,

                cube: null, //for test
            },

            gui: {
                ui: new dat.GUI(),

                //overlay: 'r2*polar_angle',
                overlay: 'r2',
                r2_min: 0.1,                  
                r2_max: 12,                  

                cortical_depth: 0.5,
                inflate: 0.5,

                split: 0, //50
                open: Math.PI/4,
            },

            legend: {
                min: 0,
                max: 1,
                colors: [],
            },

            prf: {
                r2: null,
                p_angle: null,
                rf_width: null,
                ecc: null,
            },

            loading: false,
            config: window.config || window.parent.config,
        }
    },
    template: `
    <div>
        <p class="loading" v-if="loading">Loading... <span style="opacity: 0.5; font-size: 80%">{{loading}}</span></p>
        <div id="three" ref="three"/>
        <div class="logo">brainlife.io</div>
        <div class="controls-help">
            <span>Rotate</span>
            <span>Zoom</span>
            <span>Pan</span>
            <br>
            <img src="controls.png" height="50px"/>
        </div>
        <div class="color-legend" v-if="legend.colors.length > 0">
            <div class="color" v-for="color in legend.colors" :style="{'background-color': 'rgb('+color.r+','+color.g+', '+color.b+')'}"/>
            <br>
            <span class="min">{{legend.min.toFixed(2)}}</span>
            <span class="max">{{legend.max.toFixed(2)}}</span>
        </div>
    </div>
    `,
    
    //components: ['prfview'],
    mounted() {

        let viewbox = this.$refs.three.getBoundingClientRect();

        //camera
        this.t.camera = new THREE.PerspectiveCamera(45, viewbox.width / viewbox.height, 1, 1000);
        this.t.camera.position.z = 200;
        
        //renderer
        this.t.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        this.t.renderer.autoClear = false;
        this.t.renderer.setSize(viewbox.width, viewbox.height);
        this.$refs.three.appendChild(this.t.renderer.domElement);
        
        //scene
        this.t.scene = new THREE.Scene();

        //amb.light
        var ambientLight = new THREE.AmbientLight(0x505050);
        this.t.scene.add(ambientLight);

        //camera light
        this.t.camera_light = new THREE.PointLight(0xffffff, 1);
        //this.t.camera_light.radius = 1;
        this.t.scene.add(this.t.camera_light);

        this.t.controls = new THREE.OrbitControls(this.t.camera, this.t.renderer.domElement);
        this.t.controls.autoRotate = true;
        this.t.controls.addEventListener('start', ()=>{
            //stop roration when user interacts
            this.t.controls.autoRotate = false;
        });

        window.addEventListener("resize", this.resized);

        this.init_gui();
        this.animate();

        this.load();
    },

    watch: {
    },

    methods: {
        init_gui() {
            let ui = this.gui.ui.addFolder('UI');
            ui.add(this.t.controls, 'autoRotate').listen();
            //ui.add(this.gui, 'show_stats');

            ui.add(this.gui, 'cortical_depth', 0, 1).step(0.01).onChange(v=>{
                if(!this.mesh.lh) return;
                this.mesh.lh.morphTargetInfluences[0] = v;
                this.mesh.rh.morphTargetInfluences[0] = v;
                this.update_color();
            });
            ui.add(this.gui, 'inflate', 0, 1).step(0.01).onChange(v=>{
                if(!this.mesh.lh) return;
                this.mesh.lh.morphTargetInfluences[1] = v;
                this.mesh.rh.morphTargetInfluences[1] = v;
            });
            ui.add(this.gui, 'split', 0, 150).onChange(v=>{
                if(!this.mesh.lh) return;
                this.update_position();
            });
            ui.add(this.gui, 'open', 0, Math.PI).onChange(v=>{
                if(!this.mesh.lh) return;
                this.update_position();
            });

            ui.open();
            
            var overlay = this.gui.ui.addFolder('Overlay');
            overlay.add(this.gui, 'overlay', [ 'none', 'r2', 'r2*polar_angle', 'r2*rf_width', 'r2*eccentricity' ]).onChange(v=>{
                //console.log(v);
                this.update_color();
            });
            overlay.add(this.gui, 'r2_min', 0, 0.5).step(0.01).onChange(v=>{
                this.update_color();
            });
            overlay.add(this.gui, 'r2_max', 0, 12).step(0.01).onChange(v=>{
                this.update_color();
            });
            overlay.open();
        },

        resized() {
            var viewbox = this.$refs.three.getBoundingClientRect();
            this.t.camera.aspect = viewbox.width / viewbox.height;
            this.t.camera.updateProjectionMatrix();
            this.t.renderer.setSize(viewbox.width, viewbox.height);
        },

        /*
        mousemove(event) {
        },
        mouseup(event) {
        },
        mousedown(event) {
        },
        */

        update_position() {
            this.mesh.lh.position.x = -this.gui.split;
            this.mesh.rh.position.x = this.gui.split;
            this.mesh.lh.rotation.z = -this.gui.open;
            this.mesh.rh.rotation.z = this.gui.open;
        },

        update_color() {
            //make sure we have everything we need
            if(!this.mesh.lh) return;
            if(!this.mesh.rh) return;
            if(!this.prf.r2) return;

            //console.log("update_color");
            let r2, v;
            let vmin, vmax;
            switch(this.gui.overlay) {
            case "r2":
                r2 = this.prf.r2;
                vmin = r2.stats.min;
                vmax = r2.stats.max;
                break;
            case "r2*polar_angle":
                r2 = this.prf.r2;
                v = this.prf.p_angle;
                vmin = -3.14;
                vmax = 3.14;
                break;
            case "r2*rf_width":
                r2 = this.prf.r2;
                v = this.prf.rf_width;
                vmin = v.stats.min;
                vmax = v.stats.max;
                break;
            case "r2*eccentricity":
                r2 = this.prf.r2;
                v = this.prf.ecc;
                vmin = v.stats.min;
                vmax = v.stats.max;
                break;
            }

            let lh_geometry = this.mesh.lh.geometry;
            let lh_color = lh_geometry.attributes.color;
            let lh_position = lh_geometry.attributes.position;

            let rh_geometry = this.mesh.rh.geometry;
            let rh_color = rh_geometry.attributes.color;
            let rh_position = rh_geometry.attributes.position;
//
            let lh_white_geometry = this.mesh.lh.white_geometry;
            let rh_white_geometry = this.mesh.rh.white_geometry;
//
//            set_color.call(this, rh_color, rh_position);
//            set_color.call(this, lh_color, lh_position);
            set_color.call(this, rh_color, rh_position, rh_white_geometry.attributes.position);
            set_color.call(this, lh_color, lh_position, lh_white_geometry.attributes.position);


            function set_color(color, position, white_position) {

                set_color.call(this, rh_color, rh_position);
                set_color.call(this, lh_color, lh_position);

                this.legend.min = vmin;
                this.legend.max = vmax;
                this.legend.colors = [];
                for(let i = 0;i < 256;++i) {
                    let h;
                    if(this.gui.overlay == "r2") h = map_value(i, 0, 256, 0, 60); //red to yellow (r2 only)
                    else h = map_value(i, 0, 256, 0, 240); //red to blue
                    let s = 1;
                    let l = 0.5;
                    this.legend.colors.push(hsl_to_rgb(h, s, l));
                }


                color.needsUpdate = true;
                //console.dir(this.prf.r2.header);

                for(var i = 0;i < color.count;++i) { 
                    if(!r2) {
                        //must be none - show white-ish brain
                        color.setXYZ(i, 200, 200, 200); 
                        continue;
                    }
                    //get vertex coord
                    let x_b = position.getX(i);
                    let y_b = position.getY(i);
                    let z_b = position.getZ(i);

                    let x_w = white_position.getX(i);
                    let y_w = white_position.getY(i);
                    let z_w = white_position.getZ(i);

                    let x = (x_w - x_b) * this.gui.cortical_depth + x_b
                    let y = (y_w - y_b) * this.gui.cortical_depth + y_b
                    let z = (z_w - z_b) * this.gui.cortical_depth + z_b

                    //convert it to voxel coords and get the value
                    let header = this.prf.r2.header;
                    let affine = matrix_invert(header.affine);
                    let vx = Math.round(x*affine[0][0] + y*affine[0][1] + z*affine[0][2] + affine[0][3]);
                    let vy = Math.round(x*affine[1][0] + y*affine[1][1] + z*affine[1][2] + affine[1][3]);
                    let vz = Math.round(x*affine[2][0] + y*affine[2][1] + z*affine[2][2] + affine[2][3]);

                    let r2_val = r2.get(vx, vy, vz);

                    if(isNaN(r2_val)) {
                        color.setXYZ(i, 50, 50, 50); 
                        continue;
                    }
//
                    //if( r2_val > 3 ) {
                    //    r2_val = 0
                    //}
//
                    //TODO - the way r2/min/max is applied is wrong
                    /*
                    r2_val = map_value(r2_val, 
                        this.prf.r2.stats.min - this.gui.r2_min, 
                        this.gui.r2_max/this.prf.r2.stats.max, 
                        0, 1);
                    */
                    r2_val = map_value(r2_val, vmin, vmax, this.gui.r2_min, 1);
                    if(i % 1000 == 0) console.log(r2_val, v);

                    let h, s, l;
                    if(v) {
                        let v_val = v.get(vx, vy, vz);      
                        if(isNaN(v_val)) {
                            color.setXYZ(i, 50, 50, 150); 
                            continue;
                        }
                        h = map_value(v_val, vmin, vmax, 0, 240); //red to blue
                        s = 1;
                        l = r2_val;
                    } else {
                        //r2 only
                        h = map_value(r2_val, 0, 1, 0, 60; //red to yellow
                        //h = map_value(r2_val, 0, 1, 0, 60); //red to yellow
                        s = 1;
                        l = r2_val;

                        //handle r2_val overflow..
                        if(h > 60) {
                            //l += h/60;
                            h = 60; 
                        }
                    }
                    
                    let {r,g,b} = hsl_to_rgb(h, s, l);
                    color.setXYZ(i, r, g, b);
                }
            }

        },

        animate() {
            this.t.controls.update();
            this.t.camera_light.position.copy(this.t.camera.position);

            this.render();
            requestAnimationFrame(this.animate);
        },

        render() {
            this.t.renderer.clear();
            //this.t.renderer.render(this.back_scene, this.camera);
            //this.t.renderer.clearDepth();
            this.t.renderer.render(this.t.scene, this.t.camera);
        },


        create_mesh(material, base_geometry, white_geometry, inflated_geometry) {
            //first create a normal mesh
            var mesh = new THREE.Mesh( base_geometry, material );
//
            var white_mesh = new THREE.Mesh( white_geometry, material );
            mesh.white_geometry = white_mesh.geometry;
//
            mesh.rotation.x = -Math.PI/2;
            this.t.scene.add(mesh);
    
            //init colors for each vertices
            let position = mesh.geometry.attributes.position;
            let colors = new Uint8Array(position.count*3);
            colors.fill(0, 0, position.count);
            mesh.geometry.addAttribute('color', new THREE.BufferAttribute(colors, 3, true).setDynamic(true));

            //set as morph target
            let mattr = mesh.geometry.morphAttributes;
            mattr.position = [
                white_geometry.attributes.position.clone(),
                inflated_geometry.attributes.position.clone(),
            ];
            mattr.normal = [
                white_geometry.attributes.normal.clone(),
                inflated_geometry.attributes.normal.clone(),
            ];
            mesh.updateMorphTargets();
            return mesh;
        },

        load() {
            let vtkloader = new THREE.VTKLoader();
            let vtks = [ 
                "testdata/lh.pial.vtk",
                "testdata/lh.white.vtk",
                "testdata/lh.inflated.vtk",

                "testdata/rh.pial.vtk",
                "testdata/rh.white.vtk",
                "testdata/rh.inflated.vtk",
            ];
            let promises = vtks.map(vtk=>{
                this.loading = "surfaces";
                return new Promise((resolve, reject)=>{
                    vtkloader.load(vtk, resolve);
                });
            });

            console.log("loadin all vtks");
            Promise.all(promises).then(geometries=>{
                geometries.map(geometry=>geometry.computeVertexNormals());

                let material = new THREE.MeshLambertMaterial({
                    vertexColors: THREE.VertexColors,
                    morphTargets: true,
                    morphNormals: true, 
                });
                this.mesh.lh = this.create_mesh(material, geometries[0], geometries[1], geometries[2]);
                this.t.scene.add(this.mesh.lh);

                this.mesh.rh = this.create_mesh(material, geometries[3], geometries[4], geometries[5]);
                this.t.scene.add(this.mesh.rh);
                
                console.log("loaded all vtks");
                this.update_position();

                this.loading = "pRF volumes";
                Promise.all([ 
                    load_nifti.call(this, "testdata/prf/r2.nii.gz"), 
                    load_nifti.call(this, "testdata/prf/polarAngle.nii.gz"), 
                    load_nifti.call(this, "testdata/prf/rfWidth.nii.gz"), 
                    load_nifti.call(this, "testdata/prf/eccentricity.nii.gz")
                ]).then(outs=>{
                    console.log("loaded all nii.gz");
                    this.prf.r2 = outs[0];
                    this.prf.p_angle = outs[1];
                    this.prf.rf_width = outs[2];
                    this.prf.ecc = outs[3];
                    this.update_color();
                    this.loading = false;
                });

            });
            
            /* I am not sure what I can use this for..
            vtkloader.load("testdata/ctx-lh-lateraloccipital.vtk", geometry => {
                geometry.computeVertexNormals(); //for smooth shading
                let material = new THREE.MeshLambertMaterial({
                    color: new THREE.Color(0.2,0.5,1),
                    //shininess: 80,
                });
                var mesh = new THREE.Mesh( geometry, material );
                mesh.rotation.x = -Math.PI/2;
                this.t.scene.add(mesh);

                //randomize positions
                let position = mesh.geometry.attributes.position.clone();
                for ( var j = 0, jl = position.count; j < jl; j ++ ) {
                  position.setXYZ(j,
                    position.getX( j ) * 2 * Math.random(),
                    position.getY( j ) * 2 * Math.random(),
                    position.getZ( j ) * 2 * Math.random()
                  );
                }

                //set as morph target
                let mattr = mesh.geometry.morphAttributes;
                mattr.position = [position];
                mesh.updateMorphTargets();
                mesh.morphTargetInfluences[0] = 0.05;
            });
            */

            function load_nifti(path) {
                return new Promise((resolve, reject)=>{
                    this.loading = path;
                    fetch(path).then(res=>{
                        return res.arrayBuffer()
                    }).then(buf=>{
                        buf = nifti.decompress(buf);
                        let header = nifti.readHeader(buf);
                        let image = nifti.readImage(header, buf);

                        /*
                        https://nifti.nimh.nih.gov/pub/dist/src/niftilib/nifti1.h
                        #define DT_UINT8                   2
                        #define DT_INT16                   4
                        #define DT_INT32                   8
                        #define DT_FLOAT32                16
                        #define DT_COMPLEX64              32
                        #define DT_FLOAT64                64
                        #define DT_RGB24                 128
                        */
                       //https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects#Indexed_collections
                        switch(header.datatypeCode) {
                        case 8: //DT_INT32
                            image = new Int32Array(image);
                            break;
                        case 16: //DT_FLOAT32
                            image = new Float32Array(image);
                            break;
                        case 64: //DT_FLOAT64
                            image = new Float64Array(image);
                            break;
                        }
                        let x_step = 1;
                        let y_step = header.dims[1];
                        let z_step = header.dims[1]*header.dims[2];

                        let get = function(x, y, z) {
                            let idx = x_step*x+y_step*y+z_step*z;
                            return image[idx];
                        }

                        //find min/max
                        let min = null;
                        let max = null;
                        image.forEach(v=>{
                            if (!isNaN(v)) {
                                if (min == null) min = v;
                                else min = v < min ? v : min;
                                if (max == null) max = v;
                                else max = v > max ? v : max;
                            }
                        });
                        console.dir({min, max})
                        resolve({header, image, stats: {min, max}, get});
                    });
                });
            }

        },
    },
});

