import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: { params: string[] } }
) {
  try {
    const imageName = params.params.join('/');
    
    // Security check - only allow alphanumeric, hyphens, underscores, and dots
    if (!/^[a-zA-Z0-9\-_\.]+$/.test(imageName)) {
      return new NextResponse('Invalid image name', { status: 400 });
    }
    
    // Construct the path to the image file
    const imagePath = path.join(process.cwd(), 'tools', 'word-details-generator', 'output', 'images', imageName);
    
    // Check if file exists
    if (!fs.existsSync(imagePath)) {
      // Return a placeholder image if the requested image doesn't exist
      const placeholderSvg = `
        <svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="#f3f4f6"/>
          <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="18" fill="#9ca3af" text-anchor="middle" dy=".3em">
            Image Not Found
          </text>
        </svg>
      `;
      
      return new NextResponse(placeholderSvg, {
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'public, max-age=300', // 5 minutes cache
        },
      });
    }
    
    // Read the image file
    const imageBuffer = fs.readFileSync(imagePath);
    
    // Determine content type based on file extension
    let contentType = 'image/png'; // default
    if (imageName.endsWith('.svg')) {
      contentType = 'image/svg+xml';
    } else if (imageName.endsWith('.jpg') || imageName.endsWith('.jpeg')) {
      contentType = 'image/jpeg';
    } else if (imageName.endsWith('.png')) {
      contentType = 'image/png';
    }
    
    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000', // 1 year cache
        'Access-Control-Allow-Origin': '*', // Allow CORS for mobile
      },
    });
    
  } catch (error) {
    console.error('Error serving image:', error);
    
    // Return error placeholder
    const errorSvg = `
      <svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#fef2f2"/>
        <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="18" fill="#dc2626" text-anchor="middle" dy=".3em">
          Error Loading Image
        </text>
      </svg>
    `;
    
    return new NextResponse(errorSvg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'no-cache',
      },
    });
  }
}
