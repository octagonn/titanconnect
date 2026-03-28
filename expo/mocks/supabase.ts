// mocks/supabase.ts
type SupabaseMock = {
  from: jest.Mock<any, any>;
  update: jest.Mock<any, any>;
  eq: jest.Mock<any, any>;
  select: jest.Mock<any, any>;
  single: jest.Mock<any, any>;
};

export const supabase: SupabaseMock = {
  from: jest.fn(),
  update: jest.fn(),
  eq: jest.fn(),
  select: jest.fn(),
  single: jest.fn()
};

// ---- Enable call chaining ----
supabase.from.mockImplementation(() => supabase);
supabase.update.mockImplementation(() => supabase);
supabase.eq.mockImplementation(() => supabase);
supabase.select.mockImplementation(() => supabase);
supabase.single.mockImplementation(() => ({
  data: null,
  error: null
}));

// ---- Response helpers ----
export const successResponse = (data: any) => ({
  data,
  error: null
});

export const errorResponse = (message: string) => ({
  data: null,
  error: {
    message,
    details: "",
    hint: "",
    code: "400",
    name: "PostgrestError",
  }
});
