// This file is for learning lint and format only

const unusedName = 'test';

function calculateSum(a: number, b: number) {
  const result = a + b;
  console.log(result);
  return result;
}

var globalValue = 100;

export { calculateSum };
