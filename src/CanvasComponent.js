import React, { useEffect, useRef, useState, useCallback } from 'react';
import './App.css';
const CanvasComponent = () => {
    
    const canvasRef = useRef(null);
    const [canvasItems, setCanvasItems] = useState([]);
    //const [dragItem, setDragItem] = useState(null);
    const [dragging, setDragging] = useState(false);
    const [dragItemIndex, setDragItemIndex] = useState(null);



    // Variables for panning
    const [panX, setPanX] = useState(0);
    const [panY, setPanY] = useState(0);

    // Variables for zooming
    const [zoom, setZoom] = useState(1);
    const zoomFactor = 1.01;
    const minZoom = 0.6; // minimum zoom level
    const maxZoom = 3; // maximum zoom level

    // Variables for mouse panning
    const [isPanning, setIsPanning] = useState(false);
    const [startPanX, setStartPanX] = useState(0);
    const [startPanY, setStartPanY] = useState(0); 

    const drawGrid = useCallback((ctx, canvas) => {
      ctx.beginPath();
      ctx.strokeStyle = "lightgray";
      ctx.lineWidth = 2;
    
      // calculate the number of lines to draw based on the zoom level
      const numLines = Math.ceil(Math.max(canvas.width, canvas.height) / (5 * zoom));
      
      // draw vertical lines
      for (let i = -numLines; i <= numLines; i++) {
        const x = (panX % (15 * zoom)) + i * 15 * zoom;
        ctx.moveTo(x, -canvas.height);
        ctx.lineTo(x, canvas.height);
      }
      
      // draw horizontal lines
      for (let i = -numLines; i <= numLines; i++) {
        const y = (panY % (20 * zoom)) + i * 15 * zoom;
        ctx.moveTo(-canvas.width, y);
        ctx.lineTo(canvas.width, y);
      }
    
      ctx.stroke();
  }, [panX, panY, zoom]);

    // Draw function
    const draw = useCallback((ctx, canvas) => {
      // clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    
      // save context state
      ctx.save();
    
      // translate and scale context
      ctx.translate(panX, panY);
      ctx.scale(zoom, zoom);
    
      // draw grid
      drawGrid(ctx, canvas);
    
      // restore context state
      ctx.restore();
    
      // request next animation frame
      requestAnimationFrame(() => draw(ctx, canvas));
    
      // Adjust the font size according to the zoom level
      ctx.font = `${16 * zoom}px Arial`;
      ctx.fillStyle = "black";
    
      for (const item of canvasItems) {
        const adjustedX = item.x * zoom + panX;
        const adjustedY = item.y * zoom + panY;
        ctx.fillText(item.text, adjustedX, adjustedY);
      }
    }, [panX, panY, zoom, canvasItems, drawGrid]);
    

    const onDrop = (event) => {
      event.preventDefault();
      const data = event.dataTransfer.getData("text/plain");
    
      // Calculate the position where the item was dropped and add the item to the canvas items array
      const rect = canvasRef.current.getBoundingClientRect();
      const x = (event.clientX - rect.left - panX) / zoom;
      const y = (event.clientY - rect.top - panY) / zoom;
      setCanvasItems([...canvasItems, { text: data, x, y }]);
    };
    

    const onDragOver = (event) => {
        event.preventDefault();  // This is necessary to allow a drop.
    };

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    let animationFrameId;

    const render = () => {
        draw(ctx, canvas);
        animationFrameId = window.requestAnimationFrame(render);
    };
    render();

    // Add event listeners for panning and zooming
    const handleMouseDown = (event) => {
        // check if user clicked on an item
        const rect = canvasRef.current.getBoundingClientRect();
        const mouseX = (event.clientX - rect.left - panX) / zoom;
        const mouseY = (event.clientY - rect.top - panY) / zoom;
        let clickedOnItem = false;
        for (let i = canvasItems.length - 1; i >= 0; i--) {
            const item = canvasItems[i];
            // considering each character as 16px wide and 24px tall
            if (
                mouseX >= item.x && 
                mouseX <= item.x + (16 * item.text.length) &&
                mouseY >= item.y - 24 && 
                mouseY <= item.y
            ) {
                setDragging(true);
                setDragItemIndex(i);
                clickedOnItem = true;
                break;
            }
        }

        // if user did not click on an item, start panning
        if (!clickedOnItem) {
            setIsPanning(true);
            setStartPanX(event.clientX - panX);
            setStartPanY(event.clientY - panY);
        }
    };

    const handleMouseUp = () => {
        setIsPanning(false);
        setDragging(false);
        setDragItemIndex(null);
    };

    const handleMouseMove = (event) => {
        if (isPanning) {
            // calculate new pan values
            let newPanX = event.clientX - startPanX;
            let newPanY = event.clientY - startPanY;

            // define maximum and minimum allowed pan values
            const maxPanX = 900;
            const maxPanY = 500;
            const minPanX = 800;
            const minPanY = 300;

            // check if new pan values exceed maximum or minimum allowed values
            if (newPanX > maxPanX) {
                newPanX = maxPanX;
            } else if (newPanX < minPanX) {
                newPanX = minPanX;
            }
            if (newPanY > maxPanY) {
                newPanY = maxPanY;
            } else if (newPanY < minPanY) {
                newPanY = minPanY;
            }

            // update pan values
            setPanX(newPanX);
            setPanY(newPanY);
        } else if (dragging && dragItemIndex !== null) {
          // update position of dragged item
          const rect = canvasRef.current.getBoundingClientRect();
          const x = (event.clientX - rect.left - panX) / zoom;
          const y = (event.clientY - rect.top - panY) / zoom;
          setCanvasItems((prevItems) => {
              const newItems = [...prevItems];
              newItems[dragItemIndex] = { ...newItems[dragItemIndex], x, y };
              return newItems;
          });
        }
    };

    const handleWheel = (event) => {
      event.preventDefault();

      // update zoom based on scroll direction
      let newZoom;
      if (event.deltaY < 0) {
          newZoom = zoom * zoomFactor;
      } else {
          newZoom = zoom / zoomFactor;
      }

      // check if new zoom value is within allowed range
      if (newZoom < minZoom) {
          newZoom = minZoom;
      } else if (newZoom > maxZoom) {
          newZoom = maxZoom;
      }

      // update zoom value
      setZoom(newZoom);
    };

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseout', handleMouseUp);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('wheel', handleWheel);

    return () => {
        window.cancelAnimationFrame(animationFrameId);
        canvas.removeEventListener('mousedown', handleMouseDown);
        canvas.removeEventListener('mouseup', handleMouseUp);
        canvas.removeEventListener('mouseout', handleMouseUp);
        canvas.removeEventListener('mousemove', handleMouseMove);
        canvas.removeEventListener('wheel', handleWheel);
    };
}, [draw, panX, panY, zoom, isPanning, startPanX, startPanY, dragging, dragItemIndex]);


    return <canvas ref={canvasRef} onDrop={onDrop} onDragOver={onDragOver} />;
};

export default CanvasComponent;
