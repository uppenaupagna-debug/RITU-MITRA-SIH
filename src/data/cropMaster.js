import { cereals } from "./crops/cereals";
import { pulses } from "./crops/pulses";
import { oilseeds } from "./crops/oilseeds";
import { vegetables } from "./crops/vegetables";
import { fruits } from "./crops/fruits";
import { spices } from "./crops/spices";
import { cashCrops } from "./crops/cashCrops";
import { fodder } from "./crops/fodder";
import { flowers } from "./crops/flowers";
import { medicinal } from "./crops/medicinal";

export const CROPS = [
  ...cereals,
  ...pulses,
  ...oilseeds,
  ...vegetables,
  ...fruits,
  ...spices,
  ...cashCrops,
  ...fodder,
  ...flowers,
  ...medicinal
];