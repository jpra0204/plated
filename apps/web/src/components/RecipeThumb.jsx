import { useState } from 'react';
import PropTypes from 'prop-types';

/**
 * RecipeThumb — renders a recipe image when `imageUrl` is provided and loads
 * successfully, or the existing grey placeholder div otherwise.
 *
 * [ASSUMPTION]: Created as a shared component because identical image/placeholder
 * logic is needed in exactly 3 locations (RecipeCard collapsed row, Saved card,
 * RecipeDetail hero). The spec permits a new component when reuse spans 3+ sites.
 *
 * Props:
 *   imageUrl  string|null  — image URL from the API; null means "not yet generated"
 *   alt       string       — alt text for the <img> element
 *   className string       — CSS class applied to both the <img> and the placeholder
 *                            div, so the caller's layout rules apply regardless
 */
function RecipeThumb({ imageUrl, alt = '', className = 'recipe-card__thumb' }) {
  const [imgError, setImgError] = useState(false);

  if (imageUrl && !imgError) {
    return (
      <img
        className={className}
        src={imageUrl}
        alt={alt}
        onError={() => setImgError(true)}
      />
    );
  }

  // Null imageUrl or failed load → grey placeholder rectangle (no broken-image icon)
  return <div className={className} aria-hidden="true" />;
}

RecipeThumb.propTypes = {
  imageUrl:  PropTypes.string,
  alt:       PropTypes.string,
  className: PropTypes.string,
};

export default RecipeThumb;
