import React, { useEffect, useState } from "react";
import { Box } from "@chakra-ui/react";

interface BracketArrowProps {
  sourceId: string;
  targetId: string;
  color?: string;
  thickness?: number;
  zIndex?: number;
}

export const BracketArrow: React.FC<BracketArrowProps> = ({
  sourceId,
  targetId,
  color = "red.500",
  thickness = 3,
  zIndex = 999,
}) => {
  // Use CSS border for arrows - a very simple but reliable approach
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // This creates a div at the top level of the document for the arrows
    const arrowContainer =
      document.querySelector(".tournament-bracket-arrows") ||
      (() => {
        const div = document.createElement("div");
        div.className = "tournament-bracket-arrows";
        div.style.position = "absolute";
        div.style.top = "0";
        div.style.left = "0";
        div.style.width = "100%";
        div.style.height = "100%";
        div.style.pointerEvents = "none";
        div.style.zIndex = String(zIndex);
        document.body.appendChild(div);
        return div;
      })();

    // Create simple arrow elements - straight line with right angle
    const arrowId = `arrow-${sourceId}-${targetId}`;

    // Check for existing arrow with this ID and remove it
    const existingArrow = document.getElementById(arrowId);
    if (existingArrow) {
      existingArrow.remove();
    }

    // Create vertical connector from source
    const verticalSource = document.createElement("div");
    verticalSource.id = `${arrowId}-v1`;
    verticalSource.style.position = "absolute";
    verticalSource.style.backgroundColor = color;
    verticalSource.style.width = `${thickness}px`;

    // Create horizontal connector
    const horizontal = document.createElement("div");
    horizontal.id = `${arrowId}-h`;
    horizontal.style.position = "absolute";
    horizontal.style.backgroundColor = color;
    horizontal.style.height = `${thickness}px`;

    // Create vertical connector to target
    const verticalTarget = document.createElement("div");
    verticalTarget.id = `${arrowId}-v2`;
    verticalTarget.style.position = "absolute";
    verticalTarget.style.backgroundColor = color;
    verticalTarget.style.width = `${thickness}px`;

    // Add arrow elements to container
    arrowContainer.appendChild(verticalSource);
    arrowContainer.appendChild(horizontal);
    arrowContainer.appendChild(verticalTarget);

    // Update arrow positions function
    const updateArrowPositions = () => {
      const source = document.getElementById(sourceId);
      const target = document.getElementById(targetId);

      if (!source || !target) {
        console.log(
          `Source or target element not found: ${sourceId}, ${targetId}`
        );
        setTimeout(updateArrowPositions, 500); // Try again later
        return;
      }

      const sourceRect = source.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();

      // Calculate positions accounting for scroll
      const scrollX = window.scrollX || window.pageXOffset;
      const scrollY = window.scrollY || window.pageYOffset;

      // Get the absolute positions
      const sourceX = sourceRect.left + sourceRect.width / 2 + scrollX;
      const sourceY = sourceRect.bottom + scrollY;
      const targetX = targetRect.left + targetRect.width / 2 + scrollX;
      const targetY = targetRect.top + scrollY;

      // Calculate the middle Y position
      const midY = sourceY + (targetY - sourceY) / 2;

      // Position the vertical source connector
      verticalSource.style.left = `${sourceX}px`;
      verticalSource.style.top = `${sourceY}px`;
      verticalSource.style.height = `${midY - sourceY}px`;

      // Position the horizontal connector
      horizontal.style.left = `${Math.min(sourceX, targetX)}px`;
      horizontal.style.top = `${midY}px`;
      horizontal.style.width = `${Math.abs(targetX - sourceX)}px`;

      // Position the vertical target connector
      verticalTarget.style.left = `${targetX}px`;
      verticalTarget.style.top = `${midY}px`;
      verticalTarget.style.height = `${targetY - midY}px`;

      // Make visible
      verticalSource.style.display = "block";
      horizontal.style.display = "block";
      verticalTarget.style.display = "block";

      setVisible(true);
      console.log(`Arrow drawn from ${sourceId} to ${targetId}`);
    };

    // Update initially and on resize/scroll
    updateArrowPositions();
    window.addEventListener("resize", updateArrowPositions);
    window.addEventListener("scroll", updateArrowPositions);

    // Try several times to update in case elements are not immediately available
    setTimeout(updateArrowPositions, 100);
    setTimeout(updateArrowPositions, 500);
    setTimeout(updateArrowPositions, 1000);

    // Cleanup
    return () => {
      window.removeEventListener("resize", updateArrowPositions);
      window.removeEventListener("scroll", updateArrowPositions);
      verticalSource.remove();
      horizontal.remove();
      verticalTarget.remove();
    };
  }, [sourceId, targetId, color, thickness, zIndex]);

  // This component doesn't render anything directly
  // The arrows are added to a separate container via DOM manipulation
  return null;
};
