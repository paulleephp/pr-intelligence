import { z } from "zod";

export const prUrlParamSchema = z.string().trim().min(1);
