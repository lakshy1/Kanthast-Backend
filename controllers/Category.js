import Category from "../models/Category.js";

export const categoryPageDetails = async (req, res) => {
  try {
    const { categoryId } = req.body;

    if (!categoryId) {
      return res.status(400).json({ success: false, message: "Category ID is required" });
    }

    const selectedCategory = await Category.findById(categoryId)
      .populate({
        path: "courses",
        populate: {
          path: "instructor",
          select: "firstName lastName email",
        },
      })
      .exec();

    if (!selectedCategory) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }

    if (selectedCategory.courses.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No courses found for the selected category",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Category page details fetched successfully",
      data: selectedCategory,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
