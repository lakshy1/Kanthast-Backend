import Tag from "../models/Tag.js";

// ====================== CREATE TAG ======================
export const createTag = async (req, res) => {
  try {
    // Step 1: Fetch data
    const { name, description } = req.body;

    // Step 2: Validation
    if (!name || !description) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    // Step 3: Create entry in DB
    const tagDetails = await Tag.create({
      name,
      description,
    });

    console.log("Tag created:", tagDetails);

    // Step 4: Return response
    return res.status(201).json({
      success: true,
      message: "Tag created successfully",
      tag: tagDetails,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ====================== SHOW ALL TAGS ======================
export const showAllTags = async (req, res) => {
  try {
    // Fetch all tags, only return name + description
    const allTags = await Tag.find({}, { name: 1, description: 1 });

    return res.status(200).json({
      success: true,
      message: "All tags returned successfully",
      tags: allTags,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
