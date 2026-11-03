# 🧪 Raitumitra Satellite Engine Verification Script
import json
from satellite_engine import run_satellite_pipeline, get_command_area_data

def test_pipeline():
    print("🛰️ Starting verification test for run_satellite_pipeline...")
    # Centroid around Nalgonda/Suryapet, Telangana
    polygon = [
        [17.000, 79.500],
        [17.005, 79.500],
        [17.005, 79.505],
        [17.000, 79.505]
    ]
    date_str = "2026-06-23"
    
    try:
        data = run_satellite_pipeline(polygon, date_str)
        print("✅ run_satellite_pipeline executed successfully!")
        print(f"Dominant Crop: {data['dominant_crop']}")
        print(f"Average Stress Score: {data['avg_stress_score']}/100")
        print(f"8-day Cumulative Rain: {data['rain_8day_mm']} mm")
        print(f"8-day Cumulative Reference ET0: {data['et0_8day_mm']} mm")
        print(f"Total Water Deficit: {data['total_deficit_mm']} mm")
        
        pixels = data.get("pixels", [])
        print(f"Generated Grid Cells: {len(pixels)} pixels")
        if len(pixels) > 0:
            sample_pixel = pixels[0]
            print("\n🔍 Sample Grid Cell Details:")
            print(f"  Pixel ID: {sample_pixel['id']}")
            print(f"  Coordinates: [{sample_pixel['lat']:.4f}, {sample_pixel['lng']:.4f}]")
            print(f"  Identified Crop: {sample_pixel['crop_type']}")
            print(f"  Growth Stage: {sample_pixel['growth_stage']}")
            print(f"  Hydration Indices: VCI={sample_pixel['vci']}%, SMI={sample_pixel['smi']}%, TCI={sample_pixel['tci']}%")
            print(f"  Aggregate Stress Score: {sample_pixel['stress_score']}% ({sample_pixel['stress_level']})")
            print(f"  FAO-56 actual crop demand (ETc): {sample_pixel['etc']} mm")
            print(f"  Water Deficit: {sample_pixel['deficit']} mm")
            print(f"  Advisory: {sample_pixel['advisory']} ({sample_pixel['advisory_color']})")
            assert len(sample_pixel['ndvi_timeline']) == 12, "NDVI timeline must contain exactly 12 months."
            print("  ✅ 12-month NDVI timeline verified.")
            
    except Exception as e:
        import traceback
        print("❌ run_satellite_pipeline test failed:")
        traceback.print_exc()
        return False
        
    print("\n💧 Starting verification test for get_command_area_data...")
    try:
        cmd_data = get_command_area_data(date_str)
        print("✅ get_command_area_data executed successfully!")
        print(f"Canal Planning Date: {cmd_data['date']}")
        print(f"Total Regional Monitored Area: {cmd_data['total_monitored_ha']} Hectares")
        print(f"Overall Irrigation Volume Deficit: {cmd_data['overall_deficit_m3']} cubic meters")
        
        distributaries = cmd_data.get("distributaries", [])
        print(f"Monitored Distributary Canal Branches: {len(distributaries)}")
        for dist in distributaries:
            print(f"\n  Canal Branch: {dist['name']} ({dist['id']})")
            print(f"    Avg Regional Stress: {dist['avg_stress']}/100")
            print(f"    Total Branch Water Demand: {dist['total_demand_m3']} m³")
            print(f"    Gate Release Advisory: {dist['recommendation']} ({dist['color']})")
            print(f"    Fields Monitored: {len(dist['fields'])}")
            if len(dist['fields']) > 0:
                print(f"    Sample Field Crop: {dist['fields'][0]['crop']} | Stress: {dist['fields'][0]['stress_level']} | Demand: {dist['fields'][0]['water_demand_m3']} m³")
                
    except Exception as e:
        import traceback
        print("❌ get_command_area_data test failed:")
        traceback.print_exc()
        return False
        
    print("\n🎉 All satellite engine pipeline verification tests PASSED!")
    return True

if __name__ == "__main__":
    test_pipeline()
