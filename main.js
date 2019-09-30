
function map_value(v, in_min, in_max, out_min, out_max) {
    return (v - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
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

                overlay: 'none',
                r2_min: 0.1,                  
                r2_max: 1,                  

                cortical_depth: 0.5,
                inflate: 0,

                split: 50,
                open: Math.PI/4,
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
        <div id="three" ref="three" @mousemove="mousemove" @mousedown="mousedown" @mouseup="mouseup"/>
        <div class="logo">brainlife.io</div>
        <div class="controls-help">
            <span>Rotate</span>
            <span>Zoom</span>
            <span>Pan</span>
            <br>
            <img src="controls.png" height="50px"/>
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
            overlay.add(this.gui, 'r2_max', 0, 2).step(0.01).onChange(v=>{
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

        mousemove(event) {
        },
        mouseup(event) {
        },
        mousedown(event) {
        },

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
            //console.log(this.gui.overlay);
            //console.dir(v);

            let lh_geometry = this.mesh.lh.geometry;
            let lh_color = lh_geometry.attributes.color;
            let lh_position = lh_geometry.attributes.position;

            let rh_geometry = this.mesh.rh.geometry;
            let rh_color = rh_geometry.attributes.color;
            let rh_position = rh_geometry.attributes.position;

            set_color.call(this, rh_color, rh_position);
            set_color.call(this, lh_color, lh_position);

            function set_color(color, position) {

                color.needsUpdate = true;

                for(var i = 0;i < color.count;++i) { 
                    if(!r2) {
                        //must be none - show white-ish brain
                        color.setXYZ(i, 200, 200, 200); 
                        continue;
                    }
                    //get vertex coord
                    let x = position.getX(i);
                    let y = position.getY(i);
                    let z = position.getZ(i);
                    
                    //convert it to voxel coords and get the value
                    let header = this.prf.r2.header;
                    let vx = Math.round((x - header.qoffset_x) / -header.pixDims[1]); //TODO - flip X only if necessary
                    let vy = Math.round((y - header.qoffset_y) / header.pixDims[2]);
                    let vz = Math.round((z - header.qoffset_z) / header.pixDims[3]);
                    let r2_val = r2.get(vx, vy, vz);

                    if(isNaN(r2_val)) {
                        color.setXYZ(i, 50, 50, 50); 
                        continue;
                    }
                    //TODO - the way r2/min/max is applied is wrong
                    r2_val = map_value(r2_val, this.prf.r2.stats.min - this.gui.r2_min, this.gui.r2_max/this.prf.r2.stats.max, 0, 1);

                    let h, s, l;
                    if(v) {
                        let v_val = v.get(vx, vy, vz);      
                        if(isNaN(v_val)) {
                            color.setXYZ(i, 50, 50, 50); 
                            continue;
                        }
                        h = map_value(v_val, vmin, vmax, 0, 240); //red to blue
                        s = 1;
                        l = r2_val;
                    } else {
                        //r2 only
                        h = map_value(r2_val, 0, 1, 0, 60); //red to yellow
                        s = 1;
                        l = r2_val;
                        if(h > 60) {
                            l += h/60;
                            h = 60; 
                        }
                    }
                    
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
                        debugger;
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

