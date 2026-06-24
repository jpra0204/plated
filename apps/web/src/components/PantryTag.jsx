/* eslint-disable react/prop-types */
/**
 * PantryTag — small status pill shown next to recipe ingredients.
 *
 * variant="in-pantry" → green  ("In pantry")
 * variant="missing"   → amber  ("Missing")
 */

export default function PantryTag({ variant = 'in-pantry', className = '' }) {
  return (
    <span className={`pantry-tag pantry-tag--${variant} ${className}`}>
      {variant === 'in-pantry' ? 'In pantry' : 'Missing'}
    </span>
  );
}
