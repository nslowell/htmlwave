// Class for display a wave in a canvas.
class CanvasWave {
    // Build a new canvas wave viewer.
    // @param cnv  the target canvas.
    // @param pal  the color palette for displaying waves.
    // @param wave the wave to display.
    constructor(cnv,pal,wave) {
        // Initialize the canvas, context and wave accessers.
        this._canvas   = cnv;
        this._context  = this._canvas.getContext("2d");
        this._palette  = pal;
        this._wave     = wave;
        // Initialize the zoom factor compress level and position.
        this._zoom     = 100;
        this._compress = 10;
        this._position = 0;
        // Initialize the list of signal drawings.
        this._signals  = [];
        // Intialize the signal vertical drawing parameters.
        this._top = 35;
        this._size = 10;
        this._corner = 5;
        this._space = 5;
        // Intialize the value ruler to 0.
        this._ruler = 0;
    }

    // Add a signal to draw.
    add(sig) {
        // Create its compress levels.
        sig.cclear(); // Ensure we start afresh.
        let l = 10.0;
        // Create 10 level of compression with power of 10 lengths.
        for(let i = 0; i<10; ++i) {
            sig.compress(l);
            sig.clevel += 1;
            l = l*10.0;
        }
        // Add the signal.
        this._signals.push(sig);
    }

    // Delete a signal to draw.
    del(sig) {
	const idx = this._signals.indexOf(sig);
	if (idx != -1) this._signals.splice(idx,1);
    }

    // Update the zoom factor.
    // Also updates the current compress level.
    set zoom(z) {
        this._zoom = z;
        this.update_clevel();
    }

    // Update the value of the clevel using the number of units per pixels.
    update_clevel() {
        this._clevel = Math.trunc(Math.log10((this.end-this.start)/this.width));
        // console.log("toPx(1.0)=" + (this.width / (this.end-this.start)) + " clevel=" + this._clevel);
        if (this._clevel < 0) { this._clevel = 0; }
        if (this._clevel > 9) { this._clevel = 9; }
    }

    // Get the current compress level.
    get clevel() {
        return this._clevel;
    }

    // Update the position.
    set position(pos) {
        // console.log("new position: " + pos);
        this._position = pos;
    }

    // Update the ruler position.
    set ruler(pos) {
        this._ruler = pos;
    }

    // Get the ruler position.
    get ruler() {
        return this._ruler;
    }

    // Get the wave being viewed.
    get wave() {
        return this._wave;
    }

    // Get the display width in pixels.
    get width() {
        return this._canvas.getBoundingClientRect().width;
    }

    // Get the display width in time unit.
    get widthT() {
        return this.end - this.start;
    }

    // Get the display height in pixels.
    get height() {
        return this._canvas.getBoundingClientRect().height;
    }

    // Get the height of one signal display.
    get heightS() {
        return (this._size*2 + this._space);
    }

    // Get the start time of display.
    get start() {
        return this._position;
    }

    // Get the end time of display.
    // Note: computed to fit the screen, hence can go past the length of the
    //       wave.
    get end() {
        return this._position + (this._wave.length*(100-this._zoom))/100;
    }

    // Convert a time to a pixel x position.
    toPx(val) {
        return Math.trunc((val * this.width) / (this.end-this.start));
    }

    // Convert a pixel x position to a time.
    toT(val) {
        return (val * (this.end-this.start) / this.width) + this.start;
    }

    // Compute the width in pixels of a text.
    textWidth(txt) {
        return this._context.measureText(txt).width;
    }

    // Binary search of the index of a segment overlapping a position.
    search_by_position(segs,pos) {
        let idxS = 0;
        let idxE = segs.length-1;
        let idxM = Math.trunc((idxE+idxS) / 2);
        while(idxS < idxE) {
            // console.log("pos=" + pos +
            //     " segs[idxM].start=" + segs[idxM].start + 
            //     " segs[idxM].end=" + segs[idxM].end + 
            //     " idxS=" + idxS + " idxE=" + idxE + " idxM=" + idxM);
            if (segs[idxM].start <= pos) {
                if (segs[idxM].end >= pos) {
                    // Found.
                    return idxM;
                } else {
                    // Not found and too much on the right.
                    idxS = idxM + 1;
                }
            } else {
                // Not found and too much on the left.
                idxE = idxM - 1;
            }
            idxM = Math.trunc((idxE+idxS) / 2);
        }
        /* End of iteration, return idxM as is. */
        return idxM;
    }


    // Get the value of signal sig at the ruler position.
    value(sig) {
        // for(let seg of sig.csegs[0]) { // Use the non-compressed segments.
        //     if (seg.start <= this._ruler && seg.end > this._ruler)  {
        //         return seg.value;
        //     }
        // }
        let idx = this.search_by_position(sig.csegs[0],this._ruler);
        return idx == -1 ? "?" : sig.csegs[0][idx].value;
    }



    // Clears the viewer.
    clear() {
        this._context.clearRect(0, 0, this.width, this.height);
    }


    // Draw the axis and waves.
    draw() {
        // Estimate the number of gradations.
        let num = Math.trunc(this.width / 40);

        // Compute the gradation step.
        let fstep = Math.trunc((this.end - this.start) / num);
        let step = fstep;
        // Ensure the step is 1, 2, 5, 10, 20 and so on.
        let count = 0;
        while(step > 10) { step = step / 10; count = count + 1; }
        step = Math.trunc(step);
        switch(step) {
            case 0:
            case 1:
                step = 1;
                break;
            case 2:
            case 3:
            case 4:
                step = 2;
                break;
            case 5:
            case 6:
            case 7:
            case 8:
            case 9:
                step = 5;
                break;
            default:
                step = 10;
                break;
        }
        step = step * Math.pow(10,count);

        // Compute the postion of the first gradation.
        // let first_pos = step - this.start % step;
        // if (first_pos == step) { first_pos = 0; }
        let first_pos = this.start - this.start % step + step;
        if (first_pos > this.start+step) { first_pos -= step; }
        let pos = first_pos;
        this._context.lineWidth = 1;
        this._context.strokeStyle = this._palette.signal;
        this._context.fillStyle = this._palette.text;
        this._context.font = "12px Courier New";
            // this._context.fillText("pos=" + pos + " zoom=" + this._zoom + " length=" + this._wave.length + " start=" + this.start + " end=" + this.end + " width=" + this.width + " num=" + num + " fstep=" + fstep + " step=" + step + " toPx(step)=" + this.toPx(step), 100, 250);

        // Draw the graphics.
        context.beginPath();

        // Draw the gradations.
        while(pos < this.end) {
            this._context.moveTo(this.toPx(pos-this.start),14);
            this._context.lineTo(this.toPx(pos-this.start),20);
            pos += step;
        }
        // Draw the axis.
        this._context.moveTo(0,17);
        this._context.lineTo(this.width,17);

        // Draw the ruler.
        if (this._ruler >= this.start && this._ruler < this.end) {
            for(let i=20; i<this.height-1; i += 4) {
                this._context.moveTo(this.toPx(this._ruler-this.start), i);
                this._context.lineTo(this.toPx(this._ruler-this.start), i+2);
            }
        }

        // Draw the signals to display.
        this._context.font = "14px Courier New"; // Bigger font for signals.
        let y = this._top;
        for(sig of this._signals) {
            // Set the compress level for draing the signal.
            sig.clevel = this.clevel
            // console.log("sig=" + sig.id + " y=" + y);
            if ((typeof sig.type === 'number' && Math.abs(sig.type) > 1) || sig.type === 'string' || sig.type === 'real') {
                // Get the range of segments to draw.
                let drawS = this.search_by_position(sig.segs,this.start);
                let drawE = this.search_by_position(sig.segs,this.end);
                // Get previous segment value to detect actual transitions.
                let prevVal = (drawS > 0) ? sig.segs[drawS - 1].value : null;
                // Track end of last drawn value line to fill compression gaps.
                let lastEndX = -10;
                let lastEndDiamond = false;
                // Track the start of the current value run for text placement.
                let valRunStart = -1; // left x of current value run
                let valRunVal = null; // value of current run
                // Helper to draw value text centered in a run region.
                const drawValText = (runL0, runL1, val) => {
                    let txt = val;
                    let space = runL1 - runL0;
                    if (space < this.textWidth("0")) { return; } // No room at all.
                    let txtW = this.textWidth(txt);
                    if (txtW <= space) {
                        // Text fits, center it.
                        let vPos = runL0 + (space - txtW) / 2;
                        this._context.fillText(txt, Math.trunc(vPos), Math.trunc(y + this._size / 2));
                    } else {
                        // Text too large, truncate to fit.
                        let availW = space - this.textWidth("~") - 2;
                        if (availW <= 0) { return; } // Not even room for "~".
                        // Find how many characters fit.
                        let fitLen = txt.length;
                        while (fitLen > 0 && this.textWidth(txt.substring(0, fitLen)) > availW) {
                            fitLen--;
                        }
                        if (fitLen > 0) {
                            txt = txt.substring(0, fitLen) + "~";
                        } else {
                            txt = "~";
                        }
                        this._context.fillText(txt, Math.trunc(runL0 + 1), Math.trunc(y + this._size / 2));
                    }
                };
                // Multi-bit case.
                for(let i = drawS; i<=drawE; ++i) {
                    let seg = sig.segs[i];
                    if(seg.start < this.end && seg.end > this.start) {
                        // Can draw.
                        // Determine if value actually changed from previous/next.
                        let valueChanged = (prevVal === null || prevVal !== seg.value);
                        let nextVal = (i + 1 < sig.segs.length) ? sig.segs[i + 1].value : null;
                        let nextChanges = (nextVal === null || nextVal !== seg.value);
                        // Compute the start.
                        let x0 = this.toPx(seg.start-this.start);
                        // Fill compression gap: extend previous value lines to x0.
                        if (lastEndX >= 0 && lastEndX < x0) {
                            if (!lastEndDiamond && !valueChanged) {
                                // Same value continues: simple horizontal lines.
                                this._context.moveTo(lastEndX,y-this._size);
                                this._context.lineTo(x0,y-this._size);
                                this._context.moveTo(lastEndX,y+this._size);
                                this._context.lineTo(x0,y+this._size);
                            } else {
                                // Transition in gap: draw diamond-bounded bus.
                                let gapW = x0 - lastEndX;
                                let gCorner = Math.min(this._corner, Math.trunc(gapW / 2));
                                let gL = lastEndDiamond ? lastEndX + gCorner : lastEndX;
                                let gR = (valueChanged && x0 > 0) ? x0 - gCorner : x0;
                                if (lastEndDiamond) {
                                    let openR = Math.min(gL, x0);
                                    this._context.moveTo(lastEndX, y);
                                    this._context.lineTo(openR, y-this._size);
                                    this._context.moveTo(lastEndX, y);
                                    this._context.lineTo(openR, y+this._size);
                                }
                                if (gL < gR) {
                                    this._context.moveTo(gL, y-this._size);
                                    this._context.lineTo(gR, y-this._size);
                                    this._context.moveTo(gL, y+this._size);
                                    this._context.lineTo(gR, y+this._size);
                                }
                                if (valueChanged && x0 > 0) {
                                    let closeL = Math.max(gR, lastEndX);
                                    this._context.moveTo(closeL, y-this._size);
                                    this._context.lineTo(x0, y);
                                    this._context.moveTo(closeL, y+this._size);
                                    this._context.lineTo(x0, y);
                                }
                            }
                        }
                        if (x0 <= 0) { x0 = 0; }
                        let x1 = this.toPx(seg.end-this.start);
                        if (x1 >= this.width-1) { x1 = this.width-1; }

                        // Adaptive diamond corner: shrink to fit narrow segments.
                        let segW = x1 - x0;
                        let needStart = valueChanged && x0 > 0 ? 1 : 0;
                        let needEnd = (nextChanges && x1 < this.width-1 && i < sig.segs.length-1) ? 1 : 0;
                        let diamonds = needStart + needEnd;
                        let corner = this._corner;
                        if (diamonds > 0 && segW < corner * diamonds) {
                            corner = Math.max(0, Math.trunc(segW / diamonds));
                        }

                        // Compute value line insets for diamond transitions.
                        let l0 = needStart ? x0 + corner : x0;
                        let l1 = needEnd ? x1 - corner : x1;
                        if (i >= sig.segs.length-1) { l1 = this.width-1; }

                        // When value changes, flush text for the previous run
                        // and start a new run.
                        if (valueChanged) {
                            // Draw text for the previous value run.
                            if (valRunVal !== null && valRunStart >= 0) {
                                drawValText(valRunStart, x0, valRunVal);
                            }
                            // Start a new value run.
                            valRunStart = l0;
                            valRunVal = seg.value;

                            // Draw diamond start transition.
                            this._context.moveTo(x0+corner,y-this._size);
                            this._context.lineTo(x0,y);
                            this._context.lineTo(x0+corner,y+this._size);
                        }

                        // Draw the value lines (only when segment is wide enough).
                        if (l0 < l1) {
                            this._context.moveTo(l0,y-this._size);
                            this._context.lineTo(l1,y-this._size);
                            this._context.moveTo(l0,y+this._size);
                            this._context.lineTo(l1,y+this._size);
                        }

                        // Draw the end transition only if next value differs.
                        if (nextChanges) {
                            // Draw diamond end transition.
                            this._context.moveTo(x1-corner,y-this._size);
                            this._context.lineTo(x1,y);
                            this._context.lineTo(x1-corner,y+this._size);
                            // Flush text for the ending value run.
                            drawValText(valRunStart >= 0 ? valRunStart : l0, l1, seg.value);
                            valRunStart = -1;
                            valRunVal = null;
                        }
                        lastEndDiamond = (nextChanges && x1 < this.width-1 && i < sig.segs.length-1);
                        lastEndX = x1;
                        prevVal = seg.value;
                    }
                }
                // Flush text for any remaining value run at end of visible area.
                if (valRunVal !== null && valRunStart >= 0) {
                    let endL = Math.min(lastEndX, this.width - 1);
                    drawValText(valRunStart, endL, valRunVal);
                }
            }
            else {
                // Single-bit case.
                // Get the range of segments to draw.
                let drawS = this.search_by_position(sig.segs,this.start);
                let drawE = this.search_by_position(sig.segs,this.end);
                // Get previous segment value to detect actual transitions.
                let prevVal = (drawS > 0) ? sig.segs[drawS - 1].value : null;
                // Track drawing state for filling compression gaps.
                let lastEndX = -10;      // x where last value line ended
                let lastDrawnVal = null; // value of last drawn segment
                // Helper to draw a single-bit value line.
                const drawBitLine = (val, xa, xb) => {
                    switch(val) {
                        case "0":
                            this._context.moveTo(xa,y+this._size);
                            this._context.lineTo(xb,y+this._size);
                            break;
                        case "1":
                            this._context.moveTo(xa,y-this._size);
                            this._context.lineTo(xb,y-this._size);
                            break;
                        case "z":
                            this._context.moveTo(xa,y);
                            this._context.lineTo(xb,y);
                            break;
                        default:
                            for(let j = xa+this._corner; j < xb;
                                j += this._corner) {
                                this._context.moveTo(j,y-this._size);
                                this._context.lineTo(j-this._corner,y+this._size);
                            }
                    }
                };
                // Do the drawing.
                for(let i = drawS; i<=drawE; ++i) {
                    let seg = sig.segs[i];
                    if(seg.start >= this.end) {
                        break;
                    }
                    if(seg.end > this.start) {
                        // Compute the start and end positions.
                        let x0 = this.toPx(seg.start-this.start);
                        if (x0 <= 0) { x0 = 0; }
                        let x1 = this.toPx(seg.end-this.start);
                        if (x1 >= this.width-1) { x1 = this.width-1; }
                        let valChanged = (prevVal !== null && prevVal !== seg.value);
                        if (valChanged) {
                            // Fill gap with old value before transition.
                            if (lastEndX >= 0 && lastEndX < x0 && lastDrawnVal !== null) {
                                drawBitLine(lastDrawnVal, lastEndX, x0);
                                lastEndX = x0;
                            }
                            // Draw transition.
                            this._context.moveTo(x0,y-this._size);
                            this._context.lineTo(x0,y+this._size);
                        }
                        prevVal = seg.value;
                        // Skip value lines if segment is too narrow.
                        if (x1 - lastEndX < 2) { continue; }
                        if (x1 - x0 < 2) { x0 = x1 - 1; }
                        // Extend start to fill any gap with same value.
                        let drawStart = x0;
                        if (!valChanged && lastEndX >= 0 && lastEndX < x0) {
                            drawStart = lastEndX;
                        }
                        // Draw the value line.
                        drawBitLine(seg.value, drawStart, x1);
                        lastEndX = x1;
                        lastDrawnVal = seg.value;
                    }
                }
            }
            y += this._size*2 + this._space;
        }

        this._context.stroke();

        // Draw the gradation values.
        this._context.font = "12px Courier New"; // Smaller font for the axis.
        // Calculate the max value width to adjust the frequency of text.
        let textMax = this.textWidth(this.wave.length.toString());
        let textFac = Math.ceil((textMax+4) / this.toPx(step));
        switch(textFac) {
            case 1:
            case 2:
                break;
            case 3:
            case 4:
            case 5:
                textFac = 5;
                break;
            default:
                textFac = 10;
        }
        // Place the gradation values.
        pos = first_pos;
        // let val = Math.trunc(this.start / (step*textFac)) * (step*textFac);
        // let val = first_pos - first_pos % (step*textFac);
        // if (this.start % (step*textFac) != 0) { val += step*textFac*2; }
        // if (this.start % (step*textFac) != 0) { pos += step; }
        // if (this.start % (step*textFac) > step) { pos -= step; }
        while(pos < this.end) {
            // let txt = val.toString();
            let txt = pos.toString();
            let x =Math.round(this.toPx(pos-this.start)-this.textWidth(txt)/2)-1;
            if (x<0 && pos == 0) { x = 0; }
            /* No text overlap, can display. */
            this._context.fillText(txt, x , 12);
            pos += step * textFac;
            // val += step * textFac;
        }
    }
}

