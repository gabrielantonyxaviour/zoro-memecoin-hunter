import time
import undetected_chromedriver as uc
from utils.chrome import list_chrome_profiles
from scrapers.video_scraper import VideoScraper
from storage.result_handler import save_combined_results
from config import CHROME_USER_DATA_DIR

def process_search_term(driver, keyword, max_results=50):
    """Process a single search term and return results"""
    search_url = f"https://www.tiktok.com/search?q={keyword}"
    results = []
    processed_urls = set()
    scroll_pause_time = 2
    
    try:
        print(f"\nProcessing search term: {keyword}")
        print(f"Navigating to: {search_url}")
        driver.get(search_url)
        time.sleep(10)
        
        print("\nWaiting for video feed...")
        
        while len(results) < max_results:
            try:
                video_elements = driver.find_elements(By.CSS_SELECTOR, "div.css-1soki6-DivItemContainerForSearch")
                
                if not video_elements:
                    print("No video elements found. Waiting...")
                    time.sleep(5)
                    continue
                
                for video_element in video_elements:
                    if len(results) >= max_results:
                        break
                        
                    video_data = VideoScraper.extract_video_data(video_element)
                    if video_data and video_data['video_url'] and video_data['video_url'] not in processed_urls:
                        results.append(video_data)
                        processed_urls.add(video_data['video_url'])
                        print(f"Found video {len(results)}/{max_results}: {video_data['video_url']}")
                
                if len(results) >= max_results:
                    print(f"\nReached target number of videos for '{keyword}'")
                    break
                
                last_height = driver.execute_script("return document.documentElement.scrollHeight")
                driver.execute_script(f"window.scrollTo(0, {last_height});")
                time.sleep(scroll_pause_time)
                
                new_height = driver.execute_script("return document.documentElement.scrollHeight")
                if new_height == last_height:
                    print(f"\nReached end of feed for '{keyword}'")
                    break
                    
            except Exception as e:
                print(f"\nError during scraping '{keyword}': {e}")
                break
                
        return results
        
    except Exception as e:
        print(f"\nError processing search term '{keyword}': {str(e)}")
        return results

def main():
    search_terms = [
        "memecoin",
        # "solana",
        # "crypto",
        # "pumpfun"
    ]
    
    print("Available Chrome profiles:")
    profiles = list_chrome_profiles()
    for i, profile in enumerate(profiles):
        print(f"{i+1}. {profile}")
    
    while True:
        try:
            profile_index = int(input("\nEnter the number of the profile where you're logged into TikTok: ")) - 1
            if 0 <= profile_index < len(profiles):
                selected_profile = profiles[profile_index]
                break
            else:
                print("Invalid selection. Please try again.")
        except ValueError:
            print("Please enter a valid number.")
    
    print(f"\nUsing Chrome profile: {selected_profile}")
    
    max_results = int(input("Enter maximum number of videos to extract per search term (default 50): ") or "50")
    
    options = uc.ChromeOptions()
    options.add_argument(f'--user-data-dir={CHROME_USER_DATA_DIR}')
    options.add_argument(f'--profile-directory={selected_profile}')
    
    try:
        print("\nStarting Chrome...")
        driver = uc.Chrome(options=options)
        print("Chrome started. Waiting for initialization...")
        time.sleep(5)
        
        all_results = {}
        
        for search_term in search_terms:
            results = process_search_term(driver, search_term, max_results)
            if results:
                all_results[search_term] = {
                    'total_videos': len(results),
                    'videos': results
                }
                print(f"Successfully processed {len(results)} videos for '{search_term}'")
            time.sleep(5)
        
        if all_results:
            saved_path = save_combined_results(all_results)
            if saved_path:
                print("\nSuccessfully saved all results!")
        
        print("\nAll search terms processed!")
        if 'driver' in locals():
            print("Press Enter to close browser...")
            input()
            
    except Exception as e:
        print(f"\nError: {str(e)}")
        if 'all_results' in locals() and all_results:
            saved_path = save_combined_results(all_results)
            if saved_path:
                print("\nSaved partial results before error!")
    
    finally:
        if 'driver' in locals():
            driver.quit()

if __name__ == "__main__":
    main()