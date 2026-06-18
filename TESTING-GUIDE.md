# 🧪 Complete Testing Guide - Test Cart Drawer App on Your Store

Step-by-step guide to test the app on your own Shopify store.

---

## 📋 Prerequisites

Before you start, make sure you have:

- ✅ **Shopify Partner Account** (free at https://partners.shopify.com)
- ✅ **Test Store** (free development store in Partner Dashboard)
- ✅ **Node.js >= 18.20.0** (check: `node --version`)
- ✅ **PostgreSQL running** (local or managed)
- ✅ **App code cloned** to your machine
- ✅ **Dependencies installed** (`npm install`)
- ✅ **Database setup** (`npm run setup`)

---

## 🚀 Step 1: Start Your App Locally

```bash
# Navigate to app directory
cd ~/path/to/cart-drawer-app

# Start development server
npm run dev
```

**You should see:**
```
✓ Shopify CLI tunnel
✓ Tunnel URL: https://abc123.trycloudflare.com
✓ Copy this URL → your .env as SHOPIFY_APP_URL
```

Copy that tunnel URL and update `.env`:
```
SHOPIFY_APP_URL=https://abc123.trycloudflare.com
```

---

## 📱 Step 2: Create/Access Your Test Store

### Option A: Create New Test Store
1. Go to https://partners.shopify.com
2. Click **Stores** → **Add store** → **Create development store**
3. Choose:
   - **Store type:** Development store
   - **Store name:** "Cart Drawer Testing" (or any name)
   - **Store purpose:** Testing app
   - **Admin language:** Your language
4. Click **Create store**
5. Wait ~1 minute for store creation
6. Click **Visit store** to verify it's created

### Option B: Use Existing Test Store
- If you already have a test store, just use that

### Option C: Use Your Real Store (Advanced)
⚠️ **Only if you're confident** — you can test on a real store, but be careful with customer data.

---

## 🔗 Step 3: Install App on Test Store

1. Go to Partner Dashboard → **Your app** (Cart Drawer)
2. Click **Test app**
3. Select your test store from dropdown
4. Click **Install**
5. You'll be redirected to your app's admin page

**You should see:**
```
Dashboard page with:
✅ "Cart Drawer is installed and active" banner
✅ Status indicators for features
✅ Current configuration card
```

---

## ✅ Step 4: Test Admin Dashboard

### Dashboard Page
1. Click **Dashboard** in sidebar
2. **Verify:**
   - ✅ Welcome banner shows
   - ✅ 4 feature status cards visible
   - ✅ Quick setup buttons work
   - ✅ Current configuration displayed

### Settings Page
1. Click **Settings** in sidebar
2. **Test General Tab:**
   - [ ] Change drawer title → "My Cart"
   - [ ] Click color picker → select new color
   - [ ] Change button text color
   - [ ] Verify all fields accept input
   - [ ] Click **Save settings**
   - [ ] See "Settings saved successfully!" message

3. **Test Shipping Tab:**
   - [ ] Toggle shipping bar on/off
   - [ ] Change threshold to $25
   - [ ] Change shipping text
   - [ ] Click **Save settings**

4. **Test Upsells Tab:**
   - [ ] Toggle upsells on/off
   - [ ] Click **Upsells** page

### Upsells Page
1. Click **Upsells** in sidebar
2. **Test product picker:**
   - [ ] Click **Pick products**
   - [ ] Search for products (or scroll)
   - [ ] Select 3-5 products
   - [ ] Click **Save**
   - [ ] See "Upsell products updated!" message
   - [ ] Products display in list
   - [ ] Click remove button → product disappears

### Analytics Page (Placeholder)
1. Click **Analytics** in sidebar
2. **Verify:**
   - ✅ Page loads
   - ✅ Info banner about future analytics shows

---

## 🛍️ Step 5: Test Storefront (Most Important!)

### Add Cart Drawer Block to Theme

1. **Go to your test store** (not admin):
   - Visit: `https://yourstore.myshopify.com`
   
2. **Open Theme Editor:**
   - Click **Customize** in top menu (Shopify admin)
   - Or go to **Themes** → **Customize**

3. **Add Cart Drawer Block:**
   - Find the **Add app blocks** section (or **Apps** section)
   - Look for **Cart Drawer**
   - Click **Add app block**
   - Choose location: **Header** (so it's visible everywhere)
   - Click **Add block**

4. **Verify it was added:**
   - You should see a new **Cart Drawer** section in theme editor
   - Settings should be available (drawer title, colors, etc.)

5. **Save changes:**
   - Click **Save** in theme editor
   - The app block is now live on storefront

---

## 🧪 Step 6: Test Storefront Features

### Test 1: Open Cart Drawer
1. Visit your store homepage
2. Look for **cart icon** in header
3. Click it
4. **Verify:**
   - [ ] Drawer slides in from right
   - [ ] Overlay darkens background
   - [ ] "Your Cart" title shows
   - [ ] Cart is empty (or shows existing items)

### Test 2: Add Product to Cart
1. Go to any **product page**
2. Click **Add to cart**
3. **Verify:**
   - [ ] Drawer opens automatically
   - [ ] Product appears in drawer
   - [ ] Quantity shows as "1"
   - [ ] Product price shows correctly
   - [ ] Subtotal updates

### Test 3: Modify Quantity
1. In drawer, find the product
2. Click **+** button to increase qty
3. **Verify:**
   - [ ] Quantity increases instantly
   - [ ] Subtotal updates
   - [ ] No page reload

4. Click **−** button to decrease
5. **Verify:**
   - [ ] Quantity decreases
   - [ ] Price updates

### Test 4: Remove Product
1. Click **X** button on product
2. **Verify:**
   - [ ] Product fades out animation
   - [ ] Item removed from cart
   - [ ] Subtotal updates to $0

### Test 5: Free Shipping Progress Bar
1. Go to Settings → Shipping tab
2. Set threshold to **$20**
3. Click **Save**
4. Go back to storefront
5. Add product that costs **$15**
6. **Verify in drawer:**
   - [ ] Progress bar shows (70% filled)
   - [ ] Text: "Spend $5 more for FREE shipping!"
7. Add another product (**total $25+**)
8. **Verify:**
   - [ ] Progress bar is 100% filled
   - [ ] Text: "🎉 You've unlocked FREE shipping!"
   - [ ] Bar color changed

### Test 6: Upsell Products
1. Go to Settings → Upsells tab
2. Toggle ON if off
3. Go to Upsells page → pick 3-4 products
4. Go back to storefront
5. Clear cart (remove all items)
6. Add 1 product to cart
7. **Verify in drawer:**
   - [ ] "You might also like" section appears
   - [ ] 3-4 product cards show (not the one in cart)
   - [ ] Each shows: image, name, price
   - [ ] "Add to cart" button on each
8. Click "Add to cart" on upsell
9. **Verify:**
   - [ ] Product added to cart
   - [ ] Upsell section updates (that product hidden)
   - [ ] Subtotal increases

### Test 7: Discount Code
1. Create a discount code in Shopify Admin:
   - **Discounts** → **Create discount** → **Code**
   - Name: "TESTCODE"
   - Type: "Amount off orders"
   - Value: $5 off
   - Save
2. Go to storefront cart drawer
3. Scroll to bottom → find **Discount code** input
4. Enter: **TESTCODE**
5. Click **Apply**
6. **Verify:**
   - [ ] Success message: "Code applied! Redirecting to checkout..."
   - [ ] Redirected to checkout
   - [ ] Discount applied in checkout

### Test 8: Order Notes
1. Go to Settings → Checkout tab
2. Toggle **Enable order note field** ON
3. Click **Save**
4. Go to storefront → add product
5. Open drawer
6. Scroll to see **Order note** textarea
7. Type: "Please gift wrap this!"
8. Click **Checkout**
9. **Verify in checkout:**
   - [ ] Note appears in checkout form
   - [ ] Can be submitted with order

### Test 9: Close Drawer
1. Open drawer
2. **Test 3 ways to close:**
   - [ ] Click **X** button → closes
   - [ ] Click overlay (dark area) → closes
   - [ ] Press **Escape** key → closes
3. **Verify:**
   - [ ] Drawer slides out to right
   - [ ] Overlay fades
   - [ ] Body scroll re-enabled

### Test 10: Mobile Responsiveness
1. Open **DevTools** (F12)
2. Click **Device Toggle** (phone icon)
3. Select **iPhone 12** or similar
4. Refresh page
5. Add product to cart
6. **Verify on mobile:**
   - [ ] Drawer takes full width
   - [ ] All buttons are easily tappable (44px+ height)
   - [ ] Text is readable
   - [ ] No horizontal scrolling
   - [ ] Product images display
   - [ ] Quantity +/− buttons work
   - [ ] Swiping closed works

---

## 🎨 Step 7: Test Customization

### Test Color Changes
1. Admin → Settings → General tab
2. Change accent color → **Blue** (#0066FF)
3. Click **Save**
4. Go to storefront, add product
5. **Verify in drawer:**
   - [ ] Checkout button is blue
   - [ ] Progress bar (if showing) is blue
   - [ ] All buttons changed color

6. Change to **Red** (#FF0000)
7. Go to storefront
8. **Verify:**
   - [ ] Colors updated (might need refresh)

### Test Text Changes
1. Admin → Settings → General tab
2. Change drawer title → "Shopping Cart"
3. Click **Save**
4. Go to storefront
5. Open drawer
6. **Verify:**
   - [ ] Title now shows "Shopping Cart"

---

## 🔍 Step 8: Check Browser Console for Errors

1. Storefront → Open **DevTools** (F12)
2. Click **Console** tab
3. Add product to cart
4. **Verify:**
   - [ ] No red error messages
   - [ ] No 404 errors
   - [ ] "ECD: ready" message shows (success)

If you see errors:
- Note the error message
- Check `cart-drawer.js` for issues
- Check browser console logs

---

## 📊 Step 9: Test on Different Browsers

Test on at least 2 browsers:

### Chrome
```
✅ Add product
✅ Open drawer
✅ Modify quantity
✅ Close drawer
```

### Firefox / Safari / Edge
```
✅ Repeat above tests
✅ Verify animations smooth
✅ Check no console errors
```

---

## 📱 Step 10: Test on Real Mobile Device

1. Find your tunnel URL in terminal (e.g., `https://abc123.trycloudflare.com`)
2. On your phone, visit your test store
3. Add product → open drawer
4. **Test on actual device:**
   - [ ] Drawer opens smoothly
   - [ ] Touch interactions work
   - [ ] Quantity buttons responsive
   - [ ] No lag or stuttering
   - [ ] Text readable
   - [ ] Buttons easily tappable

---

## 🐛 Step 11: Common Issues & Troubleshooting

### Issue: Drawer Not Showing
**Causes:**
1. Block not added to theme
2. JavaScript not loading
3. Browser cached old version

**Fix:**
- [ ] Verify block is in Theme Editor
- [ ] Check DevTools Console for errors
- [ ] Hard refresh: Ctrl+Shift+R (or Cmd+Shift+R on Mac)
- [ ] Check that `cart-drawer.js` is loading (Network tab)

### Issue: Styling Looks Wrong
**Cause:** CSS not loaded or older version cached

**Fix:**
- [ ] Hard refresh storefront
- [ ] Check Network tab → `cart-drawer.css` loads
- [ ] Check that accent color setting is applied

### Issue: Add to Cart Button Not Working
**Cause:** Form not intercepted, JavaScript error

**Fix:**
- [ ] Check Console for errors
- [ ] Verify app is installed
- [ ] Check that block is in theme
- [ ] Try on a different product

### Issue: Settings Not Syncing
**Cause:** App proxy not responding

**Fix:**
- [ ] Check app is running (`npm run dev`)
- [ ] Check database has settings (check Prisma)
- [ ] Hard refresh storefront
- [ ] Check `/apps/cart-drawer?endpoint=settings` in network tab

### Issue: Colors Not Updating
**Cause:** CSS variables not applied, cache

**Fix:**
- [ ] Hard refresh
- [ ] Check that theme editor saved changes
- [ ] Check that database was updated
- [ ] Verify correct color format in settings

---

## ✅ Complete Testing Checklist

```
ADMIN DASHBOARD
☐ Dashboard loads
☐ Settings save
☐ Colors change
☐ Text updates
☐ Toggles work
☐ Upsell picker works
☐ Analytics page loads

STOREFRONT - BASIC
☐ Drawer opens on cart click
☐ Empty state shows correctly
☐ Add to cart opens drawer
☐ Product appears in cart
☐ Quantity updates
☐ Remove item works
☐ Drawer closes (X, overlay, Escape)

STOREFRONT - FEATURES
☐ Free shipping bar appears
☐ Progress bar fills
☐ Unlocked message shows
☐ Upsell products appear
☐ Upsell add to cart works
☐ Discount code input appears
☐ Discount code applies
☐ Order notes field appears

MOBILE
☐ Responsive on mobile
☐ Full width on small screens
☐ Touch interactions smooth
☐ Buttons easily tappable
☐ Readable text

BROWSER
☐ Chrome ✓
☐ Firefox ✓
☐ Safari ✓
☐ Edge ✓

CONSOLE
☐ No red errors
☐ No 404s
☐ "ECD: ready" logged

EDGE CASES
☐ Very low inventory
☐ High price products
☐ Many upsells
☐ Very long product names
☐ Special characters in text
```

---

## 🎯 Testing Timeline

| Task | Time | What to Do |
|------|------|-----------|
| Setup | 15 min | Install app, add block |
| Admin | 30 min | Test dashboard, settings |
| Storefront | 45 min | Test all 10 features |
| Mobile | 20 min | Test on phone |
| Browsers | 15 min | Test on 2+ browsers |
| Troubleshoot | As needed | Fix any issues |
| **Total** | **2-3 hours** | Full testing |

---

## 📸 What to Screenshot

Take screenshots of:
1. Dashboard with status
2. Settings page
3. Upsells page with products
4. Storefront with drawer open
5. Drawer with products
6. Free shipping bar
7. Mobile view

These help with App Store listing & marketing.

---

## 🚀 Ready to Deploy?

After passing all tests:

1. ✅ App works locally
2. ✅ All features tested
3. ✅ No console errors
4. ✅ Mobile responsive
5. ✅ Settings persist

**Then:**
```bash
# Build for production
npm run build

# Deploy (see DEPLOYMENT.md for your provider)
# Heroku: git push heroku main
# Railway: railway up
# Render: git push
```

---

## 💡 Pro Tips

1. **Test different product prices** — makes sure math is correct
2. **Test with many items** — verify scroll works
3. **Test long product names** — verify text wrapping
4. **Test edge cases** — sold out items, variants, etc.
5. **Test on slow internet** — verify loading states
6. **Have someone else test** — fresh perspective catches issues

---

You're ready to test! 🧪 Let me know if you hit any issues! 🚀
